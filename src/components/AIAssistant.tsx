import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Bot, Send, Sparkles, Brain, TrendingUp, AlertCircle, CheckCircle, Lightbulb, X, Mic, MicOff, VolumeX, Volume2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AIMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  insights?: AIInsight[]
}

interface AIInsight {
  type: 'tip' | 'warning' | 'success' | 'idea'
  title: string
  description: string
  action?: string
}

interface AIAssistantProps {
  isOpen: boolean
  onClose: () => void
  context?: string
  data?: any[]
}

export function AIAssistant({ isOpen, onClose, context = 'general', data = [] }: AIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initial AI greeting based on context
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greetingMessage: AIMessage = {
        id: 'greeting',
        type: 'ai',
        content: getContextualGreeting(),
        timestamp: new Date(),
        insights: getContextualInsights()
      }
      setMessages([greetingMessage])
    }
  }, [isOpen, context])

  const getContextualGreeting = () => {
    switch (context) {
      case 'inventory':
        return "Hi! I'm your AI inventory assistant. I can help you analyze stock levels, identify trends, predict demand, and optimize your inventory management. What would you like to explore?"
      case 'sales':
        return "Hello! I'm your AI sales analyst. I can help you understand performance metrics, identify growth opportunities, forecast trends, and optimize your sales strategy. How can I assist you today?"
      case 'payments':
        return "Hi there! I'm your AI financial assistant. I can help you track payments, analyze cash flow, identify payment patterns, and optimize your financial processes. What can I help you with?"
      case 'tools':
        return "Welcome! I'm your AI productivity assistant. I can help you choose the right tools, optimize workflows, automate processes, and improve efficiency. What would you like to accomplish?"
      default:
        return "Hello! I'm your AI assistant. I can help you analyze data, provide insights, answer questions, and guide you through your tasks. How can I help you today?"
    }
  }

  const getContextualInsights = (): AIInsight[] => {
    const baseInsights: AIInsight[] = [
      {
        type: 'tip',
        title: 'Quick Start',
        description: 'Ask me questions in natural language like "Show me top products" or "What are the trends?"'
      },
      {
        type: 'idea',
        title: 'Voice Commands',
        description: 'Click the microphone to use voice commands for hands-free interaction'
      }
    ]

    switch (context) {
      case 'inventory':
        return [
          ...baseInsights,
          {
            type: 'success',
            title: 'Smart Analysis',
            description: 'I can automatically detect low stock, predict reorder points, and suggest optimization strategies'
          }
        ]
      case 'sales':
        return [
          ...baseInsights,
          {
            type: 'warning',
            title: 'Market Insights',
            description: 'I can identify seasonal patterns, growth opportunities, and performance bottlenecks'
          }
        ]
      default:
        return baseInsights
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const aiResponse = generateAIResponse(inputValue, context, data)
      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse.content,
        timestamp: new Date(),
        insights: aiResponse.insights
      }

      setMessages(prev => [...prev, aiMessage])
      
      // Optional: Speak the response
      if ('speechSynthesis' in window && isSpeaking) {
        const utterance = new SpeechSynthesisUtterance(aiResponse.content)
        utterance.rate = 0.9
        utterance.pitch = 1
        speechSynthesis.speak(utterance)
      }

    } catch (error) {
      toast({
        title: "AI Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generateAIResponse = (query: string, context: string, data: any[]) => {
    const lowerQuery = query.toLowerCase()
    
    // Context-aware responses
    if (lowerQuery.includes('trend') || lowerQuery.includes('pattern')) {
      return {
        content: `Based on your ${context} data, I've identified several key trends. The data shows consistent growth patterns with seasonal variations. I recommend focusing on the top-performing segments while addressing any declining areas.`,
        insights: [
          {
            type: 'success' as const,
            title: 'Growth Detected',
            description: 'Your data shows 15% growth in key metrics over the last period'
          },
          {
            type: 'tip' as const,
            title: 'Optimization Opportunity',
            description: 'Consider increasing investment in your top 3 performing categories'
          }
        ]
      }
    }

    if (lowerQuery.includes('optimize') || lowerQuery.includes('improve')) {
      return {
        content: `I've analyzed your ${context} data and found several optimization opportunities. Focus on automation, data quality improvements, and process streamlining for maximum impact.`,
        insights: [
          {
            type: 'idea' as const,
            title: 'Automation Potential',
            description: 'You could automate 60% of your current manual processes'
          },
          {
            type: 'warning' as const,
            title: 'Data Quality',
            description: 'Improving data accuracy could increase efficiency by 25%'
          }
        ]
      }
    }

    if (lowerQuery.includes('predict') || lowerQuery.includes('forecast')) {
      return {
        content: `Using advanced predictive analytics on your ${context} data, I forecast positive trends ahead. The models suggest continued growth with some seasonal adjustments to expect.`,
        insights: [
          {
            type: 'success' as const,
            title: 'Positive Outlook',
            description: 'Predictions show 20% growth potential in the next quarter'
          }
        ]
      }
    }

    // Default helpful response
    return {
      content: `I understand you're asking about "${query}" in the context of ${context}. I'm here to help analyze your data, provide insights, and guide you through optimization strategies. Could you be more specific about what you'd like to explore?`,
      insights: [
        {
          type: 'tip' as const,
          title: 'Try These Commands',
          description: 'Ask about "trends", "optimization", "predictions", or "analysis"'
        }
      ]
    }
  }

  const startVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => setIsListening(true)
      recognition.onend = () => setIsListening(false)
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInputValue(transcript)
      }

      recognition.onerror = () => {
        toast({
          title: "Voice Recognition Error",
          description: "Could not process voice input. Please try again.",
          variant: "destructive"
        })
        setIsListening(false)
      }

      recognition.start()
    } else {
      toast({
        title: "Voice Not Supported",
        description: "Your browser doesn't support voice recognition.",
        variant: "destructive"
      })
    }
  }

  const toggleSpeaking = () => {
    setIsSpeaking(!isSpeaking)
    if (isSpeaking && 'speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed right-0 top-0 h-full w-full max-w-md">
        <Card className="h-full rounded-none border-l glass-container bg-background/95 backdrop-blur-xl">
          <CardHeader className="border-b bg-gradient-primary text-primary-foreground">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                AI Assistant
                <Sparkles className="w-4 h-4 animate-pulse" />
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSpeaking}
                  className="text-primary-foreground hover:bg-white/20"
                >
                  {isSpeaking ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-primary-foreground hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Badge variant="secondary" className="w-fit">
              <Brain className="w-3 h-3 mr-1" />
              {context.charAt(0).toUpperCase() + context.slice(1)} Context
            </Badge>
          </CardHeader>
          
          <CardContent className="flex flex-col h-full p-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground ml-auto' 
                      : 'bg-muted'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                    
                    {message.insights && message.insights.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <Separator />
                        {message.insights.map((insight, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-background/50">
                            {insight.type === 'tip' && <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5" />}
                            {insight.type === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />}
                            {insight.type === 'success' && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />}
                            {insight.type === 'idea' && <Sparkles className="w-4 h-4 text-purple-500 mt-0.5" />}
                            <div className="flex-1">
                              <p className="font-medium text-xs">{insight.title}</p>
                              <p className="text-xs opacity-80">{insight.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me anything..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={startVoiceRecognition}
                  disabled={isListening || isLoading}
                  className={isListening ? 'bg-red-500 text-white animate-pulse' : ''}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-gradient-primary"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}