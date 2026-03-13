import swaggerJsdoc from 'swagger-jsdoc';

export function setupSwagger() {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'CECB Environmental Clearance System API',
        version: '1.0.0',
        description: 'PARIVESH 3.0 PS-02 — API for Chhattisgarh Environment Conservation Board',
        contact: { name: 'CECB Tech Team', email: 'tech@cecb.cg.gov.in' },
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Development server' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: {
          RegisterInput: {
            type: 'object',
            required: ['email', 'password', 'name'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 },
              name: { type: 'string' },
              organization: { type: 'string' },
              phone: { type: 'string' },
              role: { type: 'string', enum: ['PROPONENT', 'SCRUTINY', 'MOM_TEAM'] },
            },
          },
          Application: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              projectName: { type: 'string' },
              sector: { type: 'string' },
              status: {
                type: 'string',
                enum: ['DRAFT', 'SUBMITTED', 'UNDER_SCRUTINY', 'EDS', 'REFERRED', 'MOM_GENERATED', 'FINALIZED'],
              },
              district: { type: 'string' },
              lat: { type: 'number' },
              lng: { type: 'number' },
              areaHa: { type: 'number' },
              feePaid: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          ApiResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              meta: { type: 'object' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Applications', description: 'Environmental clearance applications' },
        { name: 'Documents', description: 'Document upload and management' },
        { name: 'Payments', description: 'Fee payment via UPI' },
        { name: 'Gist', description: 'AI-generated MoM gist' },
        { name: 'Audit', description: 'Blockchain audit trail' },
        { name: 'Admin', description: 'Admin management endpoints' },
        { name: 'GIS', description: 'Geospatial proximity analysis' },
      ],
    },
    apis: ['./src/routes/*.ts'],
  };

  return swaggerJsdoc(options);
}
