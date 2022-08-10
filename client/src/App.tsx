import { useInfiniteQuery } from '@tanstack/react-query'
import kyx from './configurations/kyx'
import { z } from 'zod'
import { Fragment, useEffect, useMemo } from 'react'
import {
  complement,
  defaultTo,
  flatten,
  groupBy,
  isNil,
  map,
  pickBy,
  pipe,
  prop,
} from 'ramda'
import useInfiniteScroll from './hooks/use-infinite-scroll'
import date from './utils/date'

const createListingSchema = <T, > (schema: z.ZodType<T>) => {
  return z.object({
    cursor: z.optional(z.string()),
    data: z.array(schema),
  })
}

const requestSchema = z.object({
  id: z.string(),
  title: z.string(),
  requester: z.string(),
  key: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const requestListingSchema = createListingSchema(requestSchema)
type RequestListing = z.infer<typeof requestListingSchema>;

const recordToNested = <T,>(record: Record<string, T>) => {
  return pipe(Object.entries, map(([key, value]) => ({ key, data: value as T})))(record)
}

const transform = pipe(
  defaultTo<RequestListing[]>([]),
  map(prop('data')),
  flatten,
  groupBy(pipe((data) => data.key, date.getLocalDate)),
  recordToNested,
)

const ignoreNull = pickBy(complement(isNil));

const useRequests = () => useInfiniteQuery(['requests'],
  ({ pageParam }) => kyx.get('requests',
    { searchParams: ignoreNull({ cursor: pageParam, limit: 20 }) }).
    then((res) => res.json()).then(requestListingSchema.parseAsync), {
    getNextPageParam: (lastPage) => lastPage.cursor,
  })

function App () {
  const { data: listing, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage } = useRequests()
  const requests = useMemo(() => transform(listing?.pages),
    [listing])
  useInfiniteScroll({
    isLoading,
    hasMore: hasNextPage,
    isFetching: isFetchingNextPage,
    onLoadMore: () => fetchNextPage(),
  })

  useEffect(() => {
    console.log('requests', requests)
  }, [requests]);

  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error</div>
  if (!requests) return <div>No requests</div>

  return (
    <div className={'container mx-auto'}>
      {requests.map((r) => <Fragment  key={r.key}>
        <div className={'bg-slate-400 text-slate-800 p-1 text-sm sticky top-0'}>{r.key}</div>
        {r.data.map((req) => <div key={req.id} className={'p-1'}>{req.title}</div>)}
      </Fragment>)}
    </div>
  )
}

export default App
