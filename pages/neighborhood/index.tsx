// The street: every pixel home, at /neighborhood. Same page as the old
// /neighborhood/explore/* routes, which now redirect here.
import type { GetServerSideProps } from 'next'
import UnifiedNeighborhood, { getServerSideProps as neighborhoodProps } from './[type]/[param]'

export default UnifiedNeighborhood

export const getServerSideProps: GetServerSideProps = (context) =>
  neighborhoodProps({ ...context, query: { ...context.query, type: 'explore', param: 'all' } })
