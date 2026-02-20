/**
 * ClawPad Injector for OpenClaw
 * ==============================
 * Paste this into the OpenClaw browser console (F12 → Console).
 *
 * Uses NATIVE WebSocket only — no external libraries.
 * Implements Socket.IO v4 wire protocol directly so it works
 * even with strict Content Security Policy (script-src 'self').
 */
(function(){
  if(window.__clawpad_injected){console.log('[ClawPad] Already running.');return;}
  window.__clawpad_injected=true;

  var BRIDGE='http://'+location.hostname+':5000';
  var WS_URL='ws://'+location.hostname+':5000/socket.io/?EIO=4&transport=websocket';
  var ws,pingTimer,reconnectTimer;

  // ─── Toast ────────────────────────────────────────────────
  function toast(msg,type){
    var colors={info:['#6366f1','#818cf8'],success:['#10b981','#34d399'],error:['#ef4444','#f87171']};
    var c=colors[type||'info']||colors.info;
    var t=document.createElement('div');
    t.textContent=msg;
    t.style.cssText='position:fixed;top:20px;right:20px;z-index:999999;background:'+c[0]+';color:#fff;border:1px solid '+c[1]+';padding:12px 20px;border-radius:10px;font:500 14px -apple-system,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.3);opacity:0;transform:translateY(-10px);transition:all .3s;max-width:340px';
    document.body.appendChild(t);
    requestAnimationFrame(function(){t.style.opacity='1';t.style.transform='translateY(0)';});
    setTimeout(function(){t.style.opacity='0';t.style.transform='translateY(-10px)';setTimeout(function(){t.remove();},300);},3000);
  }

  // ─── DOM Finders ──────────────────────────────────────────
  function findInput(){
    return document.querySelector('.chat-compose__field textarea')
        || document.querySelector('textarea[placeholder*="Message"]')
        || document.querySelector('.chat-compose textarea')
        || document.querySelector('textarea');
  }
  function findSend(){
    var p=document.querySelector('.chat-compose__actions button.btn.primary');
    if(p)return p;
    var btns=document.querySelectorAll('.chat-compose__actions button');
    for(var i=0;i<btns.length;i++){if(btns[i].textContent.trim().toLowerCase().indexOf('send')>=0)return btns[i];}
    return btns.length?btns[btns.length-1]:null;
  }
  function typeMsg(text){
    var el=findInput();
    if(!el){toast('Cannot find chat input','error');return false;}
    el.focus();
    var s=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
    if(s&&s.set)s.set.call(el,text);else el.value=text;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    console.log('[ClawPad] Typed: "'+text.substring(0,60)+'..."');
    return true;
  }
  function clickSend(){
    var btn=findSend();
    if(btn){btn.click();console.log('[ClawPad] Clicked Send');return true;}
    var el=findInput();
    if(el){
      el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,shiftKey:false}));
      console.log('[ClawPad] Pressed Enter');
      return true;
    }
    return false;
  }

  // ─── Socket.IO v4 Wire Protocol over Native WebSocket ────
  //
  // Engine.IO packet types: 0=open 1=close 2=ping 3=pong 4=message
  // Socket.IO packet types (inside engine "4"): 0=CONNECT 2=EVENT 3=ACK
  //
  // Examples:
  //   "0{...}"           = Engine OPEN (server → client)
  //   "2"                = Engine PING (server → client)
  //   "3"                = Engine PONG (client → server)
  //   "40"               = SIO CONNECT to "/" namespace (client → server)
  //   "40{\"sid\":\"x\"}"= SIO CONNECTED (server → client)
  //   "42[\"event\",{}]" = SIO EVENT (both directions)

  function emit(event,data){
    if(ws&&ws.readyState===1){
      ws.send('42'+JSON.stringify([event,data]));
    }
  }

  function handleMessage(raw){
    if(raw==='2'){
      // Ping → respond with Pong
      ws.send('3');
      return;
    }
    if(raw==='3'){return;} // pong from server, ignore

    // Engine.IO "open" packet
    if(raw.charAt(0)==='0'){
      // Parse ping interval for keepalive
      try{
        var cfg=JSON.parse(raw.substring(1));
        console.log('[ClawPad] Engine connected, sid:',cfg.sid);
        // Send Socket.IO CONNECT to default namespace
        ws.send('40');
      }catch(e){}
      return;
    }

    // Socket.IO message (engine type "4")
    if(raw.charAt(0)==='4'){
      var sioType=raw.charAt(1);

      // SIO CONNECT acknowledgment
      if(sioType==='0'){
        console.log('[ClawPad] Socket.IO connected');
        toast('ClawPad connected!','success');
        // Register as injector
        emit('register',{type:'injector'});
        return;
      }

      // SIO EVENT
      if(sioType==='2'){
        try{
          var payload=JSON.parse(raw.substring(2));
          var eventName=payload[0];
          var eventData=payload[1];

          if(eventName==='execute_command'){
            handleCommand(eventData);
          }else if(eventName==='registered'){
            console.log('[ClawPad] Registered with bridge');
          }else if(eventName==='config_updated'){
            console.log('[ClawPad] Config updated');
          }
        }catch(e){
          console.warn('[ClawPad] Parse error:',e);
        }
        return;
      }

      // SIO DISCONNECT
      if(sioType==='1'){
        console.log('[ClawPad] Server disconnected');
        return;
      }
    }
  }

  function handleCommand(data){
    console.log('[ClawPad] Command:',data.label);
    toast('\u2318 '+data.label,'info');
    var typed=typeMsg(data.message);
    if(typed&&data.auto_send){
      var delay=data.send_delay_ms||500;
      setTimeout(function(){
        var sent=clickSend();
        emit('injector_status',{button_id:data.button_id,typed:true,sent:sent,timestamp:new Date().toISOString()});
        if(sent)toast('"'+data.label+'" sent!','success');
      },delay);
    }else{
      emit('injector_status',{button_id:data.button_id,typed:typed,sent:false,timestamp:new Date().toISOString()});
    }
  }

  // ─── Connect & Reconnect ──────────────────────────────────
  function connect(){
    clearTimeout(reconnectTimer);
    if(ws){try{ws.close();}catch(e){}}

    console.log('[ClawPad] Connecting to',WS_URL);
    ws=new WebSocket(WS_URL);

    ws.onopen=function(){
      console.log('[ClawPad] WebSocket open');
    };

    ws.onmessage=function(e){
      handleMessage(e.data);
    };

    ws.onclose=function(){
      console.log('[ClawPad] Disconnected — reconnecting in 3s...');
      toast('ClawPad disconnected','error');
      reconnectTimer=setTimeout(connect,3000);
    };

    ws.onerror=function(){
      console.error('[ClawPad] WebSocket error');
    };
  }

  // ─── Expose debug helpers ─────────────────────────────────
  window.__clawpad={
    reconnect:connect,
    findChatInput:findInput,
    findSendButton:findSend,
    typeMessage:typeMsg,
    clickSend:clickSend,
    emit:emit
  };

  // ─── Start ────────────────────────────────────────────────
  console.log('[ClawPad] Initializing... bridge:',BRIDGE);
  connect();
})();