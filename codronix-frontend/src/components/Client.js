import React from 'react';
import Avatar from 'react-avatar';

const Client = ({ username, socketId }) => {
    const getColorForUser = (id) => {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
            '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
        ];
        const hash = id.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="client">
            <div className="client-avatar">
                <Avatar 
                    name={username} 
                    size={40} 
                    round="50%" 
                    color={getColorForUser(socketId)}
                    textSizeRatio={2}
                />
                <div 
                    className="client-status-dot"
                    style={{ backgroundColor: getColorForUser(socketId) }}
                ></div>
            </div>
            <div className="client-info">
                <span className="client-name">{username}</span>
                <span className="client-status">Online</span>
            </div>
        </div>
    );
};

export default Client;
