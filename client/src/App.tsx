import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import kyx from "./configurations/kyx";
import { z } from "zod";
import { Fragment, useCallback, useEffect, useMemo } from "react";
import {
  addIndex,
  assoc,
  chain,
  clone,
  complement,
  defaultTo,
  flatten,
  groupBy,
  isNil,
  map,
  mergeLeft,
  mergeRight,
  nth,
  omit,
  pickBy,
  pipe,
  prop,
} from "ramda";
import useInfiniteScroll from "./hooks/use-infinite-scroll";
import date from "./utils/date";
import Checkbox from "@mui/material/Checkbox";
import List from "@mui/material/List";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemButton from "@mui/material/ListItemButton";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import IconButton from "@mui/material/IconButton";
import CommentIcon from "@mui/icons-material/Comment";
import PlayCircle from "@mui/icons-material/PlayCircle";
import Fab from "@mui/material/Fab";
import array from "./utils/array";

const createListingSchema = <T,>(schema: z.ZodType<T>) => {
  return z.object({
    cursor: z.optional(z.string()),
    data: z.array(schema),
  });
};

const requestSchema = z.object({
  id: z.string(),
  title: z.string(),
  requester: z.string(),
  done: z.boolean(),
  key: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
type Request = z.infer<typeof requestSchema>;

const requestListingSchema = createListingSchema(requestSchema);
type RequestListing = z.infer<typeof requestListingSchema>;

const recordToNested = <T,>(record: Record<string, T>) => {
  return pipe(
    Object.entries,
    map(([key, value]) => ({ key, data: value as T }))
  )(record);
};

const transform = pipe(
  defaultTo<RequestListing[]>([]),
  map(prop("data")),
  flatten,
  groupBy(pipe((data) => data.key, date.getLocalDate)),
  recordToNested
);

const ignoreNull = pickBy(complement(isNil));

const useRequests = () =>
  useInfiniteQuery(
    ["requests"],
    ({ pageParam }) =>
      kyx
        .get("requests", {
          searchParams: ignoreNull({ cursor: pageParam, limit: 20 }),
        })
        .then((res) => res.json())
        .then(requestListingSchema.parseAsync),
    {
      getNextPageParam: (lastPage) => lastPage.cursor,
    }
  );

const createRequestTuple = (infiniteData: InfiniteData<RequestListing>) => {
  return infiniteData.pages.flatMap((page, pageIndex) =>
    page.data.map((r, dataIndex): [string, [number, number]] => [
      r.id,
      [pageIndex, dataIndex],
    ])
  );
};
const createRequestMap = (infiniteData: InfiniteData<RequestListing>) =>
  new Map(createRequestTuple(infiniteData));

const useUpdateRequest = (id: string) => {
  const qc = useQueryClient();
  return useMutation(
    ["update-request", id],
    ({ done }: { done: boolean }) =>
      kyx
        .patch(`requests/${id}`, { json: { done: done } })
        .then((res) => res.json())
        .then(requestSchema.parseAsync),
    {
      onMutate: (data) => {
        qc.setQueryData<InfiniteData<RequestListing>>(
          ["requests"],
          (requests) => {
            if (!requests) return requests;
            const map = createRequestMap(requests);
            const [pageIndex, dataIndex] = map.get(id) ?? [-1, -1];
            if (pageIndex < 0 || dataIndex < 0) return requests;
            const currentPage = nth(pageIndex, requests.pages);
            if (!currentPage) return requests;
            const currentData = nth(dataIndex, currentPage.data);
            if (!currentData) return requests;
            const inner = array.replaceAt(
              currentPage.data,
              dataIndex,
              mergeRight(currentData, data)
            );
            const outer = array.replaceAt(
              requests.pages,
              pageIndex,
              assoc("data", inner, currentPage)
            );
            return assoc("pages", outer, requests);
          }
        );
      },
      onSettled: () => {
        return qc.invalidateQueries(["requests"]);
      },
    }
  );
};

const RequestItem = ({ id, done, title, requester }: Omit<Request, "key">) => {
  const { mutate } = useUpdateRequest(id);
  const toggle = useCallback(() => {
    mutate({ done: !done });
  }, [mutate, done]);

  return (
    <ListItem
      secondaryAction={
        <IconButton>
          <CommentIcon />
        </IconButton>
      }
      sx={{ paddingLeft: 0, paddingRight: 0 }}
    >
      <ListItemButton
        sx={{ paddingLeft: 0.5, paddingRight: 0.5 }}
        onClick={toggle}
      >
        <ListItemIcon>
          <Checkbox checked={done} onChange={noop} disableRipple />
        </ListItemIcon>
        <ListItemText
          primary={title}
          secondary={requester}
          sx={{
            textDecoration: done ? "line-through" : undefined,
            opacity: done ? 0.5 : 1,
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

// a no op function
const noop = () => {};

function App() {
  const {
    data: listing,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useRequests();
  const requests = useMemo(() => transform(listing?.pages), [listing]);
  useInfiniteScroll({
    isLoading,
    hasMore: hasNextPage,
    isFetching: isFetchingNextPage,
    onLoadMore: () => fetchNextPage(),
  });

  useEffect(() => {
    console.log("requests", requests);
  }, [requests]);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error</div>;
  if (!requests) return <div>No requests</div>;

  return (
    <div
      className={
        "container mx-auto max-w-md border-x border-solid border-gray-200 relative"
      }
    >
      <List>
        {map(
          ({ key, data }) => (
            <li key={key}>
              <ul>
                <ListSubheader>{key}</ListSubheader>
                {map(
                  (request) => (
                    <RequestItem key={request.id} {...omit(["key"], request)} />
                  ),
                  data
                )}
              </ul>
            </li>
          ),
          requests
        )}
      </List>
      <Fab
        variant={"extended"}
        color={"success"}
        sx={{
          position: "sticky",
          bottom: 15,
          zIndex: 100,
          float: "right",
          mr: 1,
        }}
      >
        <PlayCircle sx={{ mr: 1 }} />
        開始點歌
      </Fab>
    </div>
  );
}

export default App;
