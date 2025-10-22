const fs = require('fs');
const path = require('path');

const eventsPath = path.join(__dirname, '../panel/data/events.json');

// Leer el archivo
const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));

// Ordenar por created_at (de más antiguo a más reciente)
events.sort((a, b) => {
    return new Date(a.created_at) - new Date(b.created_at);
});

// Guardar el archivo ordenado
fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));

console.log(`✓ Eventos ordenados correctamente. Total: ${events.length}`);
