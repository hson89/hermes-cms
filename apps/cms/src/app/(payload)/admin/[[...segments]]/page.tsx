/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT DIRECTLY. */
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import configPromise from '@/payload.config'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const metadata = ({ params, searchParams }: Args) =>
  generatePageMetadata({ config: configPromise, params, searchParams, importMap })

const Page = ({ params, searchParams }: Args) =>
  RootPage({ config: configPromise, params, searchParams, importMap })

export default Page
