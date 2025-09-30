// websocket-server.js
const { Server } = require("socket.io");

const io = new Server({
  cors: {
    origin: "https://llevateloconjorvi.com", // ⚠️ ¡Importante! Reemplaza con tu dominio
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
});

// Exponemos la función de notificación
function notifyNewPurchase(purchase) {
  io.emit("new-purchase", purchase); // Envía un evento a todos los clientes conectados
}

// Inicia el servidor
io.listen(3001); // Corre en el puerto 3001

module.exports = { notifyNewPurchase };