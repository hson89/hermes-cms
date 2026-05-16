/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT DIRECTLY. */
import { RootPage } from '@payloadcms/next/views'
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

export const metadata = {
  title: 'Hermes AI Admin',
}

const Page = ({ params, searchParams }: Args) =>
  RootPage({ config: configPromise, params, searchParams, importMap })

export default Page
