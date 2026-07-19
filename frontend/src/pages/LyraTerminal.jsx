import React, { useState, useEffect, useRef } from 'react';
import { getMessageHistory } from '../api';

const API_BASE = "/api";

export default function LyraTerminal() {
  const [token, setToken] = useState(() => localStorage.getItem('lyra_token') || "");
  const [metrics, setMetrics] = useState("");

  const [loginStage, setLoginStage] = useState('user');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [loginLogs, setLoginLogs] = useState([]);
  const [chatLogs, setChatLogs] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPaginating, setIsPaginating] = useState(false);
  
  const [loginInputValue, setLoginInputValue] = useState('');
  const [chatInputValue, setChatInputValue] = useState('');
  const [isLoginDisabled, setIsLoginDisabled] = useState(false);
  const [isChatDisabled, setIsChatDisabled] = useState(false);

  const seenMessageContent = useRef(new Set());
  const chatEndRef = useRef(null);
  const loginEndRef = useRef(null);
  const pollInterval = useRef(null);
  const lastIdRef = useRef("");
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const scrollToBottomChat = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const scrollToBottomLogin = () => {
    loginEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isPaginating) {
      scrollToBottomChat();
    }
  }, [chatLogs, isThinking]);

  useEffect(() => {
    scrollToBottomLogin();
  }, [loginLogs]);

  useEffect(() => {
    if (token) {
      startPolling();
    }
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('lyra_token');
    setToken("");
    setLoginStage('user');
    setUsername('');
    setPassword('');
    setLoginInputValue('');
    setIsLoginDisabled(false);
    setChatLogs([]);
    setLoginLogs([]);
    lastIdRef.current = "";
    setHistoryOffset(0);
    setHasMoreHistory(false);
    seenMessageContent.current = new Set();
    if (pollInterval.current) clearInterval(pollInterval.current);
  };

  const refinedPoll = async () => {
    if (!tokenRef.current) return;
    if (!navigator.onLine) return; // Skip polling if device is offline to prevent ERR_INTERNET_DISCONNECTED spam
    
    try {
      const res = await fetch(`${API_BASE}/getMessages?last_id=${lastIdRef.current}`, {
        headers: { 'Authorization': `Bearer ${tokenRef.current}` }
      });
      
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        
        if (data.mind_state) {
          const parts = data.mind_state.split(':');
          if (parts.length === 5) {
            setMetrics(`MA:${parts[0]}, UA:${parts[1]}, SE:${parts[2]}, OX:${parts[3]}, CO:${parts[4]} | HR:${parseFloat(data.heartrate).toFixed(1)} | EN:${parseFloat(data.mental_energy).toFixed(0)}`);
          }
        }

        if (data.messages && data.messages.length > 0) {
          let newLastId = lastIdRef.current;
          const newLogs = [];
          data.messages.forEach(msg => {
            if (msg.id > newLastId) newLastId = msg.id;
            
            if (!seenMessageContent.current.has(msg.content) && msg.author !== "user") {
              seenMessageContent.current.add(msg.content);
              newLogs.push({ author: msg.author, content: msg.content });
            }
          });
          
          if (newLogs.length > 0) {
            setChatLogs(prev => [...prev, ...newLogs]);
            lastIdRef.current = newLastId;
          }
        }
      }
    } catch (err) {}
  };

  const startPolling = async () => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    
    try {
      // Fetch total count first
      const res = await getMessageHistory(0, 1);
      const total = res.data.total;
      
      // Fetch up to the last 50 messages
      const fetchLength = Math.min(50, total);
      const offset = Math.max(0, total - fetchLength);
      
      const historyRes = await getMessageHistory(offset, fetchLength);
      const data = historyRes.data;
      
      setHistoryOffset(offset);
      setHasMoreHistory(offset > 0);
      
      if (data.messages && data.messages.length > 0) {
        lastIdRef.current = data.messages[data.messages.length - 1].id;
        
        const newLogs = [];
        data.messages.forEach(msg => {
          if (msg.author !== 'user') {
            seenMessageContent.current.add(msg.content);
          }
          newLogs.push({ author: msg.author, content: msg.content });
        });
        setChatLogs(newLogs);
      }
      
      pollInterval.current = setInterval(refinedPoll, 5000);
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        handleLogout();
      } else {
        pollInterval.current = setInterval(refinedPoll, 5000);
      }
    }
  };

  const loadMoreHistory = async () => {
    if (isLoadingMore || !hasMoreHistory) return;
    
    setIsLoadingMore(true);
    setIsPaginating(true);
    
    try {
      const fetchLength = Math.min(50, historyOffset);
      const newOffset = Math.max(0, historyOffset - fetchLength);
      
      const res = await getMessageHistory(newOffset, fetchLength);
      const data = res.data;
      
      if (data.messages && data.messages.length > 0) {
        const olderLogs = [];
        data.messages.forEach(msg => {
          if (msg.author !== 'user') {
            seenMessageContent.current.add(msg.content);
          }
          olderLogs.push({ author: msg.author, content: msg.content });
        });
        
        setChatLogs(prev => [...olderLogs, ...prev]);
        setHistoryOffset(newOffset);
        setHasMoreHistory(newOffset > 0);
      }
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        handleLogout();
      }
    } finally {
      setIsLoadingMore(false);
      setTimeout(() => setIsPaginating(false), 100);
    }
  };

  const handleLoginSubmit = async (e) => {
    if (e.key === 'Enter') {
      const val = loginInputValue.trim();
      
      if (loginStage === 'user') {
        setUsername(val);
        setLoginLogs(prev => [...prev, { text: `user: ${val}`, className: '' }]);
        setLoginStage('password');
        setLoginInputValue('');
      } else if (loginStage === 'password') {
        setPassword(val);
        setLoginLogs(prev => [...prev, { text: `password: *******`, className: '' }]);
        setLoginInputValue('');
        setIsLoginDisabled(true);
        
        try {
          const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password: val })
          });
          
          if (!res.ok) {
            setLoginLogs(prev => [...prev, { text: 'system: auth failed.', className: 'system' }]);
            setLoginStage('user');
            setIsLoginDisabled(false);
          } else {
            const data = await res.json();
            localStorage.setItem('lyra_token', data.token);
            setLoginLogs(prev => [...prev, { text: 'system: loading lyra -->', className: 'system' }]);
            
            setTimeout(() => {
              setToken(data.token);
            }, 500);
          }
        } catch (err) {
          setLoginLogs(prev => [...prev, { text: `system: error connecting to server.`, className: 'system' }]);
          setIsLoginDisabled(false);
        }
      }
    }
  };

  const handleChatSubmit = async (e) => {
    if (e.key === 'Enter') {
      const msg = chatInputValue.trim();
      if (!msg) return;

      setChatLogs(prev => [...prev, { author: 'user', content: msg }]);
      setChatInputValue('');
      setIsChatDisabled(true);
      setIsThinking(true);

      try {
        const res = await fetch(`${API_BASE}/sendMessage`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message: msg })
        });
        
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          return;
        }

        const data = await res.json();
        setIsThinking(false);

        if (res.ok && data.reply) {
          seenMessageContent.current.add(data.reply);
          setChatLogs(prev => [...prev, { author: 'lyra', content: data.reply }]);
        }
      } catch (err) {
        setIsThinking(false);
        setChatLogs(prev => [...prev, { author: 'system', content: `system: connection timeout or error.` }]);
      }

      setIsChatDisabled(false);
    }
  };

  const formatContent = (content) => {
    return content.split('\n').map((line, idx) => (
      <React.Fragment key={idx}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  return (
    <div className="lyra-terminal-container flex flex-col h-screen w-full bg-black text-white p-5 font-mono text-sm overflow-y-auto box-border relative">
      <style>{`
        .lyra-terminal-container input {
          background: transparent;
          color: white;
          font-family: inherit;
          font-size: inherit;
          border: none;
          outline: none;
          flex-grow: 1;
          min-width: 0;
        }
        .lyra-terminal-container .text-system { color: #888; }
        .lyra-terminal-container .text-lyra { color: #5dade2; }
        .lyra-terminal-container .text-user { color: #fff; }
      `}</style>

      {/* LOGIN VIEW */}
      {!token && (
        <div className="w-full">
          <div className="pb-5">
            {loginLogs.map((log, i) => (
              <div key={i} className={`mb-1 whitespace-pre-wrap break-words ${log.className === 'system' ? 'text-system' : ''}`}>
                {log.text}
              </div>
            ))}
            <div ref={loginEndRef} />
          </div>
          
          <div className="flex flex-row items-start mb-1 whitespace-pre-wrap break-words">
            <span className="whitespace-pre">{loginStage === 'user' ? 'user: ' : 'password: '}</span>
            <input 
              type={loginStage === 'password' ? 'password' : 'text'}
              autoComplete="off"
              autoFocus
              value={loginInputValue}
              onChange={(e) => setLoginInputValue(e.target.value)}
              onKeyDown={handleLoginSubmit}
              disabled={isLoginDisabled}
            />
          </div>
        </div>
      )}

      {/* CHAT VIEW */}
      {token && (
        <div className="w-full">
          {metrics && (
            <div className="absolute top-2 right-5 text-gray-400 text-xs bg-black p-1 z-10">
              {metrics}
            </div>
          )}
          
          <div className="pb-5">
            {hasMoreHistory && (
              <div className="flex justify-center mb-4">
                <button 
                  onClick={loadMoreHistory}
                  disabled={isLoadingMore}
                  className="text-gray-500 hover:text-white transition-colors text-xs border border-gray-700 rounded px-3 py-1 cursor-pointer bg-transparent"
                >
                  {isLoadingMore ? "loading..." : "load previous messages"}
                </button>
              </div>
            )}
            
            {chatLogs.map((log, i) => (
              <div key={i} className={`mb-1 whitespace-pre-wrap break-words ${
                log.author === 'system' ? 'text-system' : 
                (log.author !== 'user' ? 'text-lyra' : 'text-user')
              }`}>
                {log.author === 'system' ? null : (log.author !== 'user' ? '> ' : '> ')}
                {formatContent(log.content)}
              </div>
            ))}
            
            {isThinking && (
              <div className="mb-1 whitespace-pre-wrap break-words text-lyra">
                {'> [thinking...]'}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="flex flex-row items-start mb-1 whitespace-pre-wrap break-words">
            <span className="whitespace-pre text-user">&gt; </span>
            <input 
              type="text" 
              autoComplete="off"
              autoFocus
              value={chatInputValue}
              onChange={(e) => setChatInputValue(e.target.value)}
              onKeyDown={handleChatSubmit}
              disabled={isChatDisabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
