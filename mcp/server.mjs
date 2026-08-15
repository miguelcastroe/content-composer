import express from 'express';
import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/server';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';

const COMPOSER_URL = process.env.COMPOSER_URL || 'https://miguelcastroe.github.io/content-composer/';
const PORT = Number(process.env.PORT || 3000);

const positionEnum = z.enum([
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right'
]);

const zoneSchema = z.object({
  frame: z.number().int().min(1).max(4).optional(),
  text: z.string(),
  position: positionEnum,
  size: z.number().int().min(18).max(120),
  weight: z.union([z.literal(300), z.literal(400), z.literal(500), z.literal(600), z.literal(700)]),
  color: z.union([z.literal('#ffffff'), z.literal('#111111')])
});

const protectedAreaSchema = z.object({
  kind: z.enum(['face', 'product', 'action', 'number', 'custom']),
  frame: z.number().int().min(1).max(4).optional(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().gt(0).max(1),
  height: z.number().gt(0).max(1)
});

const specSchema = z.object({
  version: z.literal('1.0'),
  piece_id: z.string().min(1),
  brand: z.string().min(1),
  format: z.enum(['storyboard-16x9', 'single-4x5']),
  input_mode: z.enum(['full', 'separate', 'single']).optional(),
  frame_count: z.union([z.literal(1), z.literal(3), z.literal(4)]).optional(),
  numbering: z.boolean().optional(),
  gutter: z.number().int().min(0).max(40).optional(),
  source_image_url: z.string().url().nullable().optional(),
  frame_image_urls: z.array(z.string().url()).max(4).optional(),
  protected_areas: z.array(protectedAreaSchema).optional(),
  zones: z.array(zoneSchema).min(1).max(4),
  qa: z.object({
    protect_faces: z.boolean().optional(),
    protect_products: z.boolean().optional(),
    protect_actions: z.boolean().optional(),
    hero_layout: z.boolean().optional()
  }).optional()
});

function normalizeSpec(input){
  const parsed = specSchema.parse(input);
  const single = parsed.format === 'single-4x5';
  return {
    ...parsed,
    input_mode: single ? 'single' : (parsed.input_mode || 'separate'),
    frame_count: single ? 1 : (parsed.frame_count || 3),
    numbering: parsed.numbering ?? !single,
    gutter: single ? 0 : (parsed.gutter ?? 8),
    qa: {
      protect_faces: true,
      protect_products: true,
      protect_actions: true,
      hero_layout: true,
      ...(parsed.qa || {})
    }
  };
}

function encodeSpec(spec){
  return Buffer.from(JSON.stringify(spec), 'utf8').toString('base64url');
}

function buildComposerUrl(spec){
  const base = COMPOSER_URL.endsWith('/') ? COMPOSER_URL : `${COMPOSER_URL}/`;
  return `${base}#spec=${encodeSpec(spec)}`;
}

function qaSpec(spec){
  const issues = [];
  const warnings = [];

  if(spec.format === 'single-4x5' && spec.zones.length !== 1){
    issues.push('Single 4:5 must contain exactly one text zone.');
  }
  if(spec.format === 'storyboard-16x9' && spec.zones.length !== spec.frame_count){
    issues.push(`Storyboard expects ${spec.frame_count} text zones; received ${spec.zones.length}.`);
  }
  if(spec.input_mode === 'full' && !spec.source_image_url){
    warnings.push('Full storyboard has no source_image_url yet.');
  }
  if(spec.input_mode === 'separate' && (!spec.frame_image_urls || spec.frame_image_urls.length < spec.frame_count)){
    warnings.push('Separate-frame storyboard does not yet contain all frame image URLs.');
  }
  if(spec.format === 'single-4x5' && !spec.source_image_url){
    warnings.push('Single 4:5 has no source_image_url yet.');
  }
  spec.zones.forEach((zone, i)=>{
    if(!zone.text.trim()) issues.push(`Zone ${i + 1} has empty approved text.`);
    if(zone.text.trim().split(/\s+/).length > 12 && zone.size > 60){
      warnings.push(`Zone ${i + 1}: long copy with large type may need editorial resizing.`);
    }
  });

  return {
    pass: issues.length === 0,
    issues,
    warnings,
    note: 'Image-level collisions with faces/products/actions still require visual QA after render.'
  };
}

function createComposerServer(){
  const server = new McpServer({ name: 'content-composer', version: '0.1.0' });

  server.registerTool('validate_production_spec', {
    description: 'Validate and normalize a Composer Production Spec v1 before rendering.',
    inputSchema: { spec: specSchema }
  }, async ({ spec })=>{
    try{
      const normalized = normalizeSpec(spec);
      return {
        content: [{ type: 'text', text: JSON.stringify({ ok: true, spec: normalized }, null, 2) }]
      };
    }catch(error){
      return {
        isError: true,
        content: [{ type: 'text', text: `Invalid Composer spec: ${error.message}` }]
      };
    }
  });

  server.registerTool('qa_production_spec', {
    description: 'Run pre-render production QA on a normalized Composer spec. Visual collision QA happens after render.',
    inputSchema: { spec: specSchema }
  }, async ({ spec })=>{
    const normalized = normalizeSpec(spec);
    const qa = qaSpec(normalized);
    return {
      content: [{ type: 'text', text: JSON.stringify(qa, null, 2) }]
    };
  });

  server.registerTool('build_composer_url', {
    description: 'Create an online Content Composer URL preloaded with a validated Production Spec v1.',
    inputSchema: { spec: specSchema }
  }, async ({ spec })=>{
    const normalized = normalizeSpec(spec);
    const qa = qaSpec(normalized);
    if(!qa.pass){
      return {
        isError: true,
        content: [{ type: 'text', text: JSON.stringify({ ok: false, qa }, null, 2) }]
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({
        ok: true,
        composer_url: buildComposerUrl(normalized),
        qa,
        spec: normalized
      }, null, 2) }]
    };
  });

  server.registerTool('composer_status', {
    description: 'Return Composer MCP and online UI status information.',
    inputSchema: {}
  }, async ()=>({
    content: [{ type: 'text', text: JSON.stringify({
      ok: true,
      version: '0.1.0',
      composer_url: COMPOSER_URL,
      production_spec: '1.0'
    }, null, 2) }]
  }));

  return server;
}

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next)=>{
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  if(req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.get('/', (_req, res)=>{
  res.json({ name: 'content-composer-mcp', version: '0.1.0', endpoint: '/mcp' });
});

app.post('/mcp', async (req, res)=>{
  const server = createComposerServer();
  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });
  res.on('close', ()=>transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get('/mcp', (_req, res)=>res.status(405).json({ error: 'Use POST /mcp for stateless MCP requests.' }));
app.delete('/mcp', (_req, res)=>res.status(405).json({ error: 'Stateless MCP server has no session to delete.' }));

app.listen(PORT, '0.0.0.0', ()=>{
  console.log(`Content Composer MCP listening on :${PORT}/mcp`);
});
