import { GetServerSideProps } from 'next'

// Legacy URL kept because NavBar and PixelHomesNeighborhoodWidget still link here.
export default function ExploreHomes() {
  return null
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Redirect to new unified neighborhood route
  const { template, palette, sort = 'recent', activeOnly = 'false', random } = context.query
  
  // Build redirect URL with query params
  let redirectPath = '/neighborhood/explore/all'
  
  if (sort === 'recent') redirectPath = '/neighborhood/explore/recent'
  else if (sort === 'popular') redirectPath = '/neighborhood/explore/popular'  
  else if (sort === 'random' || random === 'true') redirectPath = '/neighborhood/explore/random'
  
  // Add query params if they exist
  const queryParams = new URLSearchParams()
  if (template) queryParams.set('template', template as string)
  if (palette) queryParams.set('palette', palette as string)
  if (activeOnly === 'true') queryParams.set('activeOnly', 'true')
  
  const queryString = queryParams.toString()
  const finalRedirect = queryString ? `${redirectPath}?${queryString}` : redirectPath
  
  return {
    redirect: {
      destination: finalRedirect,
      permanent: true
    }
  }

}