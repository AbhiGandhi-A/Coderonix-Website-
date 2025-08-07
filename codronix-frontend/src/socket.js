import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        transports: ['websocket'],
        upgrade: true,
        rememberUpgrade: true,
    };
    return io('http://localhost:5000', options);
};
