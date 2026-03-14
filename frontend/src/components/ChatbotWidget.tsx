import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import api from '../lib/axios';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome-msg',
    role: 'assistant',
    content: "Hi there! I'm your AI assistant for the Parivesh 3.0 portal. I can help navigate you through environmental clearance processes, document requirements, or direct you to the correct page. How can I help today?"
  }]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Send the entire conversation history context to the backend
      const response = await api.post('/api/chat', {
        message: userMessage.content,
        history: messages.slice(1) // Avoid sending the hardcoded welcome message multiple times
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.content
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat API Error:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting to the intelligence server right now. Please try again later."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
            style={{ height: '500px', maxHeight: '80vh' }}
          >
            {/* Header */}
            <div className="bg-[#124b3f] text-white p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-2">
                <Bot className="w-6 h-6" />
                <div>
                  <h3 className="font-semibold leading-tight">Parivesh AI Assistant</h3>
                  <p className="text-xs text-emerald-100 opacity-80">Powered by Gemini</p>
                </div>
              </div>
              <button 
                onClick={toggleChat}
                className="text-white hover:bg-white/20 p-1 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-[#124b3f] text-white rounded-br-none' 
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none prose prose-sm prose-p:my-1 prose-a:text-[#124b3f] prose-a:font-semibold'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          a: ({node, ...props}) => {
                            // Automatically route internal links through react-router for SPA speed
                            const href = props.href || "";
                            if (href.startsWith('/')) {
                              return <Link to={href} {...props} className="underline decoration-[#1f7a66] underline-offset-2 hover:text-[#1f7a66]" onClick={() => setIsOpen(false)} />
                            }
                            return <a target="_blank" rel="noreferrer" {...props} />
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none p-3 shadow-sm flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#124b3f]" />
                    <span className="text-sm text-gray-500">AI is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-gray-100 mt-auto">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center space-x-2 relative"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#124b3f]/20 focus:border-[#124b3f] text-sm transition-all pr-12"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  size="icon"
                  className="absolute right-1 w-8 h-8 rounded-full bg-[#124b3f] hover:bg-[#1f7a66] transition-colors"
                  disabled={!inputValue.trim() || isLoading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleChat}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#124b3f] text-white rounded-full shadow-xl text-center flex items-center justify-center hover:bg-[#1f7a66] transition-colors z-[100] focus:outline-none focus:ring-4 focus:ring-[#124b3f]/30"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </motion.button>
    </>
  );
};
