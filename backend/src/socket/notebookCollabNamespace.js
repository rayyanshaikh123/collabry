const NotebookSession = require('../models/NotebookSession');
const Notebook = require('../models/Notebook');

/**
 * Notebook Collaboration Namespace
 * Handles real-time presence and events for shared notebooks
 */
module.exports = function (io) {
    const nsp = io.of('/notebook-collab');

    nsp.on('connection', (socket) => {
        console.log(`[Collab] User connected: ${socket.id}`);

        // Join notebook room
        socket.on('notebook:join', async ({ notebookId, userId, displayName, avatar }) => {
            try {
                const notebook = await Notebook.findById(notebookId);
                if (!notebook) return;

                // Check access
                if (!notebook.canAccess(userId)) {
                    socket.emit('error', { message: 'Access denied' });
                    return;
                }

                const room = `notebook:${notebookId}`;
                socket.join(room);
                socket.notebookId = notebookId;
                socket.userId = userId;

                // Update session state in MongoDB
                let session = await NotebookSession.findOne({ notebookId });
                if (!session) {
                    session = await NotebookSession.create({
                        notebookId,
                        aiSessionId: notebook.aiSessionId || 'pending'
                    });
                }

                session.addParticipant(userId, displayName, avatar);

                // Track this connection
                const userIdStr = userId.toString();
                const currentCons = session.activeConnections.get(userIdStr) || [];
                if (!currentCons.includes(socket.id)) {
                    currentCons.push(socket.id);
                    session.activeConnections.set(userIdStr, currentCons);
                }

                await session.save();

                // Broadcast updated participant list to everyone in the room
                nsp.to(room).emit('presence:update', {
                    participants: session.participants
                });

                console.log(`[Collab] User ${displayName} joined notebook ${notebookId}`);
            } catch (err) {
                console.error('[Collab] Join error:', err);
            }
        });

        // Typing indicator
        socket.on('user:typing', ({ notebookId, userId, isTyping }) => {
            socket.to(`notebook:${notebookId}`).emit('user:typing', {
                userId,
                isTyping
            });
        });

        // Source updates
        socket.on('source:update', ({ notebookId, action, source }) => {
            // Action: 'added', 'removed', 'toggled'
            socket.to(`notebook:${notebookId}`).emit('source:update', {
                action,
                source
            });
        });

        // AI message relay (broadcast to all collaborators)
        socket.on('ai:token', ({ notebookId, token, messageId }) => {
            nsp.to(`notebook:${notebookId}`).emit('ai:token', { token, messageId });
        });

        socket.on('chat:message', ({ notebookId, message }) => {
            nsp.to(`notebook:${notebookId}`).emit('chat:message', message);
        });

        socket.on('ai:complete', ({ notebookId, message, messageId }) => {
            nsp.to(`notebook:${notebookId}`).emit('ai:complete', { message, messageId });
        });

        // Leave notebook room
        socket.on('disconnect', async () => {
            if (socket.notebookId && socket.userId) {
                try {
                    const session = await NotebookSession.findOne({ notebookId: socket.notebookId });
                    if (session) {
                        await session.removeParticipant(socket.userId);

                        // Remove this specific connection
                        const userIdStr = socket.userId.toString();
                        const currentCons = session.activeConnections.get(userIdStr) || [];
                        const filteredLength = currentCons.filter(id => id !== socket.id).length;

                        if (filteredLength === 0) {
                            session.activeConnections.delete(userIdStr);
                        } else {
                            session.activeConnections.set(userIdStr, currentCons.filter(id => id !== socket.id));
                        }

                        await session.save();

                        nsp.to(`notebook:${socket.notebookId}`).emit('presence:update', {
                            participants: session.participants
                        });
                    }
                    console.log(`[Collab] User ${socket.id} disconnected from notebook ${socket.notebookId}`);
                } catch (err) {
                    console.error('[Collab] Leave error:', err);
                }
            }
        });
    });

    return nsp;
};
