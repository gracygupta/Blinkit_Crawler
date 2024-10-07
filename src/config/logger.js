const pino = require('pino');

// Define transports with separate destinations
const logger = pino({
    base: {
        processTitle: `PTitle:- ${process.title}`,
        processId: `P_ID:- ${process.pid}`
    },
    transport: {
        targets: [
            // Save logs to a file
            {
                target: 'pino/file', // Use pino's file target
                options: {
                    destination: './src/logs/output.log', // Log file destination
                    mkdir: true, // Create directory if it doesn't exist
                },
                level: 'info' // Logging level for this target
            },
            // Show logs in the terminal
            {
                target: 'pino-pretty', // Use pino-pretty for pretty-printed logs
                options: {
                    colorize: true,
                    translateTime: 'SYS:dd/mm/yy HH:MM:ss',
                    include: 'pid,hostname,time,level' // Fields to include in the logs
                },
                level: 'info' // Logging level for this target
            }
        ]
    }
});

module.exports = logger;
