require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/streams', require('./src/routes/classStream.routes'));
app.use('/api/students', require('./src/routes/student.routes'));
app.use('/api/subjects', require('./src/routes/subject.routes'));
app.use('/api/stream-subjects', require('./src/routes/streamSubject.routes'));

app.get('/', (req, res) => {
  res.json({ message: 'ikonex SMS API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
