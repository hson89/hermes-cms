'use server'
import { handleServerFunctions as hsf } from '@payloadcms/next/layouts'
import configPromise from '@/payload.config'

export async function handleServerFunctions(args: any) {
  return hsf({
    config: configPromise,
    ...args,
  })
}
