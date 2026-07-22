const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validierungsfehler',
      details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
    });
  }

  // Prisma specific errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Eintrag existiert bereits' });
  }
  
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Eintrag nicht gefunden' });
  }

  const message = err.message || 'Ein unerwarteter Fehler ist aufgetreten';
  res.status(500).json({ error: message });
};

export default errorHandler;
