import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import { db } from './firebase';
import { ref, set } from 'firebase/database';

export const registrarNotificaciones = async (userId: string) => {
  try {
    // 1. Pedir permiso al usuario
    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }

    if (!permissionGranted) {
      console.log('Permiso de notificaciones denegado.');
      return;
    }

    // 2. Registrar al usuario como "activo" en Firebase
    // (Esto permite saber que el usuario está conectado y puede recibir notificaciones)
    await set(ref(db, `usuarios_activos/${userId}`), {
      activo: true,
      ultimaConexion: Date.now()
    });

    console.log('Notificaciones registradas para el usuario:', userId);

  } catch (error) {
    console.error('Error al registrar notificaciones:', error);
  }
};