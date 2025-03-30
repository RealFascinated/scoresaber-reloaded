import { Elysia } from 'elysia'

import { brotliCompressSync, gzipSync, deflateSync } from 'node:zlib'

const compressors = {
	br: (buffer: Buffer) => brotliCompressSync(buffer),
	gzip: (buffer: Buffer) => gzipSync(buffer),
	deflate: (buffer: Buffer) => deflateSync(buffer)
}

function isValidEncoding(encoding: string): encoding is keyof typeof compressors {
	return Object.keys(compressors).includes(encoding)
}

export const compression = (
	options = { encodings: ['br', 'gzip', 'deflate'], threshold: 1024 }
) => {
	const app = new Elysia({ name: 'elysia-compress' })

	// 🔹 This is how you obtain the new mapResponse in the latest Elysia version
	const mapResponse = app['~adapter'].handler.mapResponse

	app.mapResponse(async (ctx) => {
		const encoding = ctx.headers['accept-encoding']
			?.split(', ')
			.find((enc) => options.encodings.includes(enc))

		if (!encoding || !isValidEncoding(encoding)) return

		// 🔹 This is how to use `mapResponse`, similar to the previous approach
		const res = mapResponse(ctx.response, { headers: {} })

		// 🔹 Ensure that a valid Response object was created
		if (!(res instanceof Response)) return

		ctx.set.headers['Content-Encoding'] = encoding

		const arrayBuffer = await res.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)

		return new Response(compressors[encoding](buffer), {
			headers: {
				'Content-Type': String(ctx.set.headers['Content-Type'] ?? 'text/plain')
			}
		})
	})

	return app.as('plugin')
}