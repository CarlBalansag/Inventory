const app = require('./app'); //Imports the fully configured express app from app.js
const PORT = process.env.PORT || 3000; //Uses the PORT environment variable if set, otherwise defaults to 3000
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)); //Starts the server and logs the URL to the console
