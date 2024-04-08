const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'features',
    password: 'Cup3rt1n02024',
    port: 5432,
});

client.connect()
  .then(() => console.log('Conectado a PostgreSQL'))
  .catch((err) => console.error('Error al conectar a PostgreSQL', err));

app.use('*', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});


app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.post('/api/data', async (req, res) => {
  try {
    console.log('req', req.body);
    const data = req.body

    for (const obj of data) {
      try {
        await client.query(`
          INSERT INTO public.feature_details (id, type, latitude, longitude, mag_type, magnitude, place, time, title, tsunami, url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          obj.id,
          obj.type,
          obj.latitude,
          obj.longitude,
          obj.magType,
          obj.magnitude,
          obj.place,
          new Date(obj.time),
          obj.title,
          obj.tsunami,
          obj.url
        ]);
      } catch (error) {
        if (error.code === '23505') {
          console.error('Error: Violación de la clave primaria. El registro ya existe:', error);
        } else {
          throw error;
        }
      }
    }
    res.status(200).json({ message: 'Datos insertados correctamente en la base de datos.' });
  } catch (error) {
    console.error('Error al insertar datos:', error);
    res.status(500).send('Error al insertar datos en la base de datos');
  }

});
  

const PORT = 3000;


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
