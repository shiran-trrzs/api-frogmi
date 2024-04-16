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

app.get('/api/features', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  let perPage = parseInt(req.query.per_page) || 10;
  perPage = Math.min(perPage, 1000);

  const magType = req.query.mag_type;

  try {
    let query = `
      SELECT * FROM public.feature_details
    `;

    if (magType) {
      query += ` WHERE mag_type = '${magType}'`;
    }

    const countQuery = `SELECT COUNT(*) FROM feature_details`;
    const countResult = await client.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count);
    
    query += `
      ORDER BY id
      OFFSET $1
      LIMIT $2
    `;

    const queryResult = await client.query(query, [(page - 1) * perPage, perPage]);

    const data = queryResult.rows.map(row => ({
      id: row.id,
      type: row.type,
      attributes: {
        external_id: row.external_id,
        magnitude: row.magnitude,
        place: row.place,
        time: row.time.toISOString(),
        tsunami: row.tsunami,
        mag_type: row.mag_type,
        title: row.title,
        coordinates: {
          longitude: row.longitude,
          latitude: row.latitude
        }
      },
      links: {
        external_url: row.url
      }
    }));

    res.json({
      data: data,
      pagination: {
        current_page: page,
        total: totalCount,
        per_page: perPage
      }
    });
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.status(500).send('Error al obtener datos');
  }
});

app.post('/api/features/:featureId/comments', async (req, res) => {
  try {
    const featureId = req.params.featureId;
    const commentBody = req.body.body;

    if (!commentBody) {
      return res.status(400).json({ error: 'El body del comentario es obligatorio.' });
    }

    const result = await client.query(`
      INSERT INTO comment_feature (feature_id, comment)
      VALUES ($1, $2)
      RETURNING *
    `, [featureId, commentBody]);

    if (result.rows.length > 0) {
      const createdComment = result.rows[0];
      return res.status(201).json({
        commentId: createdComment.id,
        featureId: createdComment.feature_id,
        message: 'El comentario se ha creado exitosamente.'
      });
    } else {
      return res.status(500).json({ error: 'Error al crear el comentario.' });
    }
  } catch (error) {
    console.error('Error al crear el comentario:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
