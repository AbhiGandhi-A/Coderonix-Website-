// src/socket.js
import { io } from 'socket.io-client';

export const initSocket = async (url) => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        transports: ['websocket'],
        upgrade: true,
        rememberUpgrade: true,
    };
    // 💡 This function now accepts the URL as a parameter.
    return io(url, options);
};