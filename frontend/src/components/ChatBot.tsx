import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiX, FiSend } from 'react-icons/fi';
import { sendChatMessage } from '../api/client';

interface Message {
    id: string;
    role: 'user' | 'bot';
    content: string;
}

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'bot',
            content: 'Hello! I am your AI Pyrolysis Assistant. How can I help you optimize your process today?',
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const resp = await sendChatMessage(userMessage.content);
            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                content: resp.data.reply,
            };
            setMessages((prev) => [...prev, botMessage]);
        } catch (err: any) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                content: 'Sorry, I am having trouble connecting to the AI brain right now. The API key might be missing.',
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 p-4 bg-orange-500 text-white rounded-full shadow-[0_0_15px_rgba(249,115,22,0.5)] z-40 transition-transform ${isOpen ? 'scale-0' : 'scale-100'}`}
            >
                <FiMessageSquare className="w-6 h-6" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className="fixed bottom-6 right-6 w-80 sm:w-96 rounded-2xl glass-card overflow-hidden z-50 flex flex-col shadow-2xl"
                        style={{ height: '500px', maxHeight: '80vh' }}
                    >
                        {/* Header */}
                        <div className="bg-surface-elevated/80 p-4 border-b border-border-light flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400">
                                    <FiMessageSquare />
                                </div>
                                <h3 className="font-medium text-text-primary">AI Assistant</h3>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-surface-highlight rounded-full transition-colors text-text-muted"
                            >
                                <FiX />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-xl p-3 text-sm ${msg.role === 'user'
                                                ? 'bg-orange-500 text-white rounded-br-none'
                                                : 'bg-surface-elevated text-text-secondary rounded-bl-none border border-border-light'
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-surface-elevated text-text-secondary border border-border-light max-w-[80%] rounded-xl rounded-bl-none p-3 text-sm flex gap-1 items-center">
                                        <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" />
                                        <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0.4s' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Form */}
                        <form
                            onSubmit={handleSend}
                            className="p-3 border-t border-border-light bg-surface-base"
                        >
                            <div className="flex relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask about pyrolysis..."
                                    className="w-full bg-surface-elevated border border-border-light rounded-full py-3 px-4 pr-12 text-sm text-text-primary focus:outline-none focus:border-orange-500/50"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 transition-colors"
                                >
                                    <FiSend className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
