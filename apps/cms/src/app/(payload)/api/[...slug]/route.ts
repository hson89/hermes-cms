/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT DIRECTLY. */
import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST } from '@payloadcms/next/routes'
import configPromise from '@/payload.config'

const wrapHandler = (handler: any) => {
  return async (request: Request, args: any) => {
    const awaitedParams = await args.params;
    const newArgs = { 
      ...args, 
      params: Promise.resolve({ ...awaitedParams, slug: awaitedParams.payload }) 
    };
    return handler(request, newArgs);
  }
}

export const GET = wrapHandler(REST_GET(configPromise))
export const POST = wrapHandler(REST_POST(configPromise))
export const PATCH = wrapHandler(REST_PATCH(configPromise))
export const DELETE = wrapHandler(REST_DELETE(configPromise))
export const OPTIONS = wrapHandler(REST_OPTIONS(configPromise))
