'use server'
import { handleServerFunctions as hsf } from '@payloadcms/next/layouts'

export async function handleServerFunctions(...args: any[]) {
  return (hsf as any)(...args)
}
