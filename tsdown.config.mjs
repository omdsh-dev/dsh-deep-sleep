const checkout = process.env.DSH_CHECKOUT
if (checkout === undefined || checkout === '') {
  throw new Error('DSH_CHECKOUT is required (run `pnpm run build`)')
}

const { clientBundle } = await import(`${checkout}/packages/client/tsdown.client.ts`)

export default clientBundle('@dsh-external/dsh-deep-sleep', ['lib/types/index.js'])
