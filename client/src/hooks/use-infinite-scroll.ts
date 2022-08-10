import { useCallback, useEffect } from 'react';

export interface UseInfiniteScroll<T> {
  isLoading: boolean;
  isFetching: boolean;
  onLoadMore: () => Promise<T>;
  hasMore: boolean | undefined;
}

const useInfiniteScroll = <T>(options: UseInfiniteScroll<T>) => {
  const onScroll = useCallback(() => {
    if (
      Math.ceil(window.innerHeight + window.scrollY) >=
      document.documentElement.scrollHeight - 150 &&
      !options.isFetching &&
      options.hasMore
    ) {
      options.onLoadMore().catch(console.error);
    }
  }, [options.isFetching, options.hasMore, options.onLoadMore]);

  useEffect(() => {
    if (
      document.body.clientHeight <= window.innerHeight &&
      options.hasMore &&
      !options.isLoading &&
      !options.isFetching
    ) {
      options.onLoadMore().catch(console.error);
    }
  }, [
    options.hasMore,
    options.isLoading,
    options.isFetching,
    options.onLoadMore,
  ]);

  useEffect(() => {
    if (
      Math.ceil(window.innerHeight + window.scrollY) >=
      document.documentElement.scrollHeight &&
      options.hasMore &&
      !options.isFetching &&
      !options.isLoading
    ) {
      options.onLoadMore().catch(console.error);
    }
  }, [
    options.isFetching,
    options.hasMore,
    options.onLoadMore,
    options.isLoading,
  ]);

  // subscribe to window scroll event
  useEffect(() => {
    window.addEventListener('scroll', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [onScroll]);
};

export default useInfiniteScroll;
