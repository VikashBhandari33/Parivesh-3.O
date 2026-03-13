import { useEffect } from 'react';
import { io as socketIO } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useQueryClient } from '@tanstack/react-query';

let socket: ReturnType<typeof socketIO> | null = null;

export function getSocket() {
  if (!socket) {
    socket = socketIO('/', { withCredentials: true, transports: ['websocket'] });
  }
  return socket;
}

export function useSocketSetup() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const s = getSocket();

    s.on('connect', () => {
      s.emit('join:user', user.id);
    });

    s.on('status:changed', ({ applicationId, status }: { applicationId: string; status: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      void queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      toast.success(`Application status updated to: ${status.replace(/_/g, ' ')}`);
    });

    s.on('notification:mom', ({ projectName }: { projectName: string }) => {
      toast.success(`AI Gist ready for: ${projectName}`, { duration: 6000 });
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
    });

    s.on('notification', ({ type }: { type: string }) => {
      const messages: Record<string, string> = {
        EDS: '⚠️ Document deficiency notice issued for your application',
        FINALIZED: '✅ Your application MoM has been finalized',
      };
      if (messages[type]) toast(messages[type], { duration: 6000 });
    });

    return () => {
      s.off('status:changed');
      s.off('notification:mom');
      s.off('notification');
    };
  }, [user, queryClient]);
}
