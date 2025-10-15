import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000, // Reduced to 10 seconds for better UX
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    if (response?.status === 401) {
      // Unauthorized - redirect to login
      Cookies.remove('token');
      delete api.defaults.headers.common['Authorization'];
      
      // Avoid redirect loop - only redirect if not already on auth pages
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
        window.location.href = '/auth/login';
      }
      
      return Promise.reject(error);
    }
    
    if (response?.status === 403) {
      toast.error('Accès refusé - Permissions insuffisantes');
      return Promise.reject(error);
    }
    
    if (response?.status >= 500) {
      toast.error('Erreur serveur - Veuillez réessayer plus tard');
      return Promise.reject(error);
    }
    
    if (response?.status === 429) {
      const message = response.data?.message || 'Rate limit exceeded';
      const retryAfter = response.headers['retry-after'];
      
      if (retryAfter) {
        const seconds = Math.ceil(parseFloat(retryAfter));
        toast.error(`Rate limited. Try again in ${seconds} second${seconds > 1 ? 's' : ''}`);
      } else if (message.includes('Try again in')) {
        toast.error(message);
      } else {
        toast.error('Too many requests - Please wait before trying again');
      }
      
      return Promise.reject(error);
    }
    
    // Client errors (4xx)
    if (response?.status >= 400 && response?.status < 500) {
      const message = response.data?.message || 'Une erreur s\'est produite';
      if (!error.config?.skipErrorToast) {
        toast.error(message);
      }
      return Promise.reject(error);
    }
    
    // Network errors
    if (error.code === 'ECONNABORTED') {
      toast.error('Timeout - La requête a pris trop de temps');
      return Promise.reject(error);
    }
    
    if (error.code === 'ERR_NETWORK') {
      toast.error('Erreur réseau - Vérifiez votre connexion');
      return Promise.reject(error);
    }
    
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const botsAPI = {
  getAll: () => api.get('/bots'),
  getById: (id: string) => api.get(`/bots/${id}`),
  create: (data: { name: string; token: string; prefix?: string }) =>
    api.post('/bots', data),
  updateConfig: (id: string, config: any) =>
    api.patch(`/bots/${id}/config`, config),
  updateToken: (id: string, token: string) =>
    api.patch(`/bots/${id}/token`, { token }),
  start: (id: string, options?: { force?: boolean }) => api.post(`/bots/${id}/start`, options),
  stop: (id: string) => api.post(`/bots/${id}/stop`),
  forceStop: (id: string) => api.post(`/bots/${id}/force-stop`),
  suspend: (id: string) => api.post(`/bots/${id}/suspend`),
  delete: (id: string) => api.delete(`/bots/${id}`),
  getInviteLink: (id: string) => api.post(`/bots/${id}/invite-link`),
  getStatus: (id: string) => api.get(`/bots/${id}/status`),
  getGuilds: (id: string) => api.get(`/bots/${id}/guilds`),
  getGuildChannels: (id: string, guildId: string) => api.get(`/bots/${id}/guilds/${guildId}/channels`),
  getGuildRoles: (id: string, guildId: string) => api.get(`/bots/${id}/guilds/${guildId}/roles`),
  getDashboardStats: () => api.get('/bots/dashboard/stats'),
  getMetrics: (id: string) => api.get(`/bots/${id}/metrics`),
  setupMetrics: () => api.post('/bots/setup/metrics'),
  refreshAssets: (id: string) => api.post(`/bots/${id}/refresh-assets`),
  refreshAllAssets: () => api.post('/bots/refresh-all-assets'),

  // Tickets
  getTickets: (botId: string) => 
    api.get(`/bots/${botId}/tickets`),
  
  getTicketStats: (botId: string) =>
    api.get(`/bots/${botId}/tickets/stats`),
  
  closeTicket: (botId: string, ticketId: string) =>
    api.post(`/bots/${botId}/tickets/${ticketId}/close`),

  renameTicket: (botId: string, ticketId: string, name: string) =>
    api.post(`/bots/${botId}/tickets/${ticketId}/rename`, { name }),

  claimTicket: (botId: string, ticketId: string) =>
    api.post(`/bots/${botId}/tickets/${ticketId}/claim`),

  unclaimTicket: (botId: string, ticketId: string) =>
    api.post(`/bots/${botId}/tickets/${ticketId}/unclaim`),

  lockTicket: (botId: string, ticketId: string) =>
    api.post(`/bots/${botId}/tickets/${ticketId}/lock`),

  unlockTicket: (botId: string, ticketId: string) =>
    api.post(`/bots/${botId}/tickets/${ticketId}/unlock`),

  addUserToTicket: (botId: string, ticketId: string, userId: string) =>
    api.post(`/bots/${botId}/tickets/${ticketId}/add-user`, { userId }),

  removeUserFromTicket: (botId: string, ticketId: string, userId: string) =>
    api.post(`/bots/${botId}/tickets/${ticketId}/remove-user`, { userId }),

  changeTicketPriority: (botId: string, ticketId: string, priority: string) =>
    api.post(`/bots/${botId}/tickets/${ticketId}/priority`, { priority }),

  deleteTicket: (botId: string, ticketId: string) =>
    api.delete(`/bots/${botId}/tickets/${ticketId}`),

  // Ticket Categories
  getTicketCategories: (botId: string) => 
    api.get(`/bots/${botId}/ticket-categories`),
  
  createTicketCategory: (botId: string, data: any) => 
    api.post(`/bots/${botId}/ticket-categories`, data),
  
  updateTicketCategory: (botId: string, categoryId: string, data: any) => 
    api.put(`/bots/${botId}/ticket-categories/${categoryId}`, data),
  
  deleteTicketCategory: (botId: string, categoryId: string) => 
    api.delete(`/bots/${botId}/ticket-categories/${categoryId}`),

  // Ticket Panels
  getTicketPanels: (botId: string) => 
    api.get(`/bots/${botId}/ticket-panels`),
  
  createTicketPanel: (botId: string, data: any) => 
    api.post(`/bots/${botId}/ticket-panels`, data),
  
  updateTicketPanel: (botId: string, panelId: string, data: any) => 
    api.put(`/bots/${botId}/ticket-panels/${panelId}`, data),
  
  deleteTicketPanel: (botId: string, panelId: string) => 
    api.delete(`/bots/${botId}/ticket-panels/${panelId}`),
  
  sendTicketPanel: (botId: string, panelId: string) =>
    api.post(`/bots/${botId}/ticket-panels/${panelId}/send`),

  getTicketCommands: (botId: string) =>
    api.get(`/bots/${botId}/tickets/commands`),

  updateTicketCommands: (botId: string, commands: any) =>
    api.put(`/bots/${botId}/tickets/commands`, commands),

  // Ticket Messages
  getTicket: (botId: string, ticketId: string) =>
    api.get(`/bots/${botId}/tickets/${ticketId}`),

  getTicketMessages: (botId: string, ticketId: string, limit?: number, before?: string) =>
    api.get(`/bots/${botId}/tickets/${ticketId}/messages`, {
      params: { limit, before }
    }),

  sendTicketMessage: (botId: string, ticketId: string, data: { content: string; userId: string; username: string; avatar?: string }) =>
    api.post(`/bots/${botId}/tickets/${ticketId}/messages`, data),

  // Logs
  getLiveLogs: (botId: string) =>
    api.get(`/bots/${botId}/logs/live`),

  getRecentLogs: (botId: string) =>
    api.get(`/bots/${botId}/logs/recent`),
};

export const utilsAPI = {
  getUrlMetadata: (url: string) =>
    api.get('/url-metadata', { params: { url } }),

  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export const usersAPI = {
  me: () => api.get('/users/me'),
  updateMe: (data: { username?: string; email?: string; avatar?: string }) =>
    api.patch('/users/me', data),
  getMyGuilds: () => api.get('/users/me/guilds'),
  getAll: (page = 1, limit = 10) =>
    api.get(`/users?page=${page}&limit=${limit}`),
  getById: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  addCredits: (id: string, data: { amount: number; reason: string }) =>
    api.post(`/users/${id}/credits`, data),
};

export const creditsAPI = {
  getMyBalance: () => api.get('/credits/me'),
  getMyHistory: (page = 1, limit = 20) => 
    api.get(`/credits/me/history?page=${page}&limit=${limit}`),
  getStats: () => api.get('/credits/stats'),
  getAllHistory: (page = 1, limit = 50) => 
    api.get(`/credits/history?page=${page}&limit=${limit}`),
  getUserHistory: (userId: string, page = 1, limit = 20) => 
    api.get(`/credits/users/${userId}/history?page=${page}&limit=${limit}`),
  addCreditsToUser: (userId: string, data: { amount: number; reason: string }) => 
    api.post(`/credits/users/${userId}/add`, data),
  getUserBalance: (userId: string) => api.get(`/credits/users/${userId}/balance`),
};

export const cacheAPI = {
  getStats: () => api.get('/cache/stats'),
  clear: () => api.delete('/cache/clear'),
  cleanup: () => api.delete('/cache/cleanup'),
};

export default api;