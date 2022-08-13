import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayCircle from '@mui/icons-material/PlayCircle';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  assoc,
  complement,
  defaultTo,
  flatten,
  groupBy,
  head,
  isNil,
  length,
  map,
  mergeRight,
  nth,
  omit,
  pickBy,
  pipe,
  prop,
  sort,
  tail,
} from 'ramda';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 } from 'uuid';
import { z } from 'zod';
import kyx from './configurations/kyx';
import useInfiniteScroll from './hooks/use-infinite-scroll';
import array from './utils/array';
import date from './utils/date';
import req from './utils/req';
import DialogTitle from '@mui/material/DialogTitle';
import copy from 'copy-to-clipboard';
import { useAtomValue, useSetAtom } from 'jotai';
import { snackbarAtom } from './states/snackbar-atom';

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
export type Request = z.infer<typeof requestSchema>;

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
  map(prop('data')),
  flatten,
  groupBy(pipe((data) => data.key, date.getLocalDate)),
  recordToNested
);

const ignoreNull = pickBy(complement(isNil));

const useRequests = () =>
  useInfiniteQuery(
    ['requests'],
    ({ pageParam }) =>
      kyx
        .get('requests', {
          searchParams: ignoreNull({ cursor: pageParam, limit: 3 }),
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
    ['update-request', id],
    ({ done }: { done: boolean }) =>
      kyx
        .patch(`requests/${id}`, { json: { done: done } })
        .then((res) => res.json())
        .then(requestSchema.parseAsync),
    {
      onMutate: (data) => {
        qc.setQueryData<InfiniteData<RequestListing>>(
          ['requests'],
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
              assoc('data', inner, currentPage)
            );
            return assoc('pages', outer, requests);
          }
        );
      },
      onSettled: () => {
        return qc.invalidateQueries(['requests']);
      },
    }
  );
};

const useDeleteRequest = (id: string) => {
  const qc = useQueryClient();
  return useMutation(
    ['delete-request', id],
    () => kyx.delete(`requests/${id}`),
    {
      onMutate: () => {
        qc.setQueryData<InfiniteData<RequestListing>>(
          ['requests'],
          (requests) => {
            console.log('here');
            if (!requests) return requests;
            const map = createRequestMap(requests);
            const [pageIndex, dataIndex] = map.get(id) ?? [-1, -1];
            if (pageIndex < 0 || dataIndex < 0) return requests;
            const currentPage = nth(pageIndex, requests.pages);
            if (!currentPage) return requests;
            const currentData = nth(dataIndex, currentPage.data);
            if (!currentData) return requests;
            const inner = array.removeAt(currentPage.data, dataIndex);
            const outer = array.replaceAt(
              requests.pages,
              pageIndex,
              assoc('data', inner, currentPage)
            );
            return assoc('pages', outer, requests);
          }
        );
      },
      onSettled: () => {
        return qc.invalidateQueries(['requests']);
      },
    }
  );
};

const RequestItem = ({ id, done, title, requester }: Omit<Request, 'key'>) => {
  const { mutate } = useUpdateRequest(id);
  const toggle = useCallback(() => {
    mutate({ done: !done });
  }, [mutate, done]);
  const { mutate: deleteRequest } = useDeleteRequest(id);
  /* menu state */
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = useMemo(() => anchorEl != null, [anchorEl]);
  const onMenuClick = useCallback(
    (action?: () => void) => () => {
      setAnchorEl(null);
      action && action();
    },
    [setAnchorEl]
  );
  /* delete confirmation */
  const [pending, setPending] = useState(false);
  /* copy state updater */
  const setOpen = useSetAtom(snackbarAtom);

  return (
    <ListItem
      secondaryAction={
        <>
          <Tooltip title={'更多'}>
            <IconButton
              onClick={(e) => {
                setAnchorEl(e.currentTarget);
              }}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
          <Menu
            open={open}
            anchorEl={anchorEl}
            onClose={() => {
              setAnchorEl(null);
              if (pending) {
                const t = setTimeout(() => {
                  setPending(false);
                  clearTimeout(t);
                }, 500);
              }
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
          >
            <MenuItem
              onClick={onMenuClick(() => {
                setOpen(true);
                copy(title);
                const t = setTimeout(() => {
                  setOpen(false);
                  clearTimeout(t);
                }, 1000);
              })}
            >
              <ListItemIcon>
                <ContentCopyIcon fontSize={'small'} />
              </ListItemIcon>
              <ListItemText>複製歌曲</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (!pending) return setPending(true);
                // perform delete logic
                deleteRequest();
                const t = setTimeout(() => {
                  setPending(false);
                  clearTimeout(t);
                }, 500);
                setAnchorEl(null);
              }}
            >
              <ListItemIcon>
                {pending ? <InfoOutlinedIcon /> : <DeleteIcon />}
              </ListItemIcon>
              <ListItemText>{pending ? '確認刪除' : '刪除'}</ListItemText>
            </MenuItem>
          </Menu>
        </>
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
            textDecoration: done ? 'line-through' : undefined,
            opacity: done ? 0.5 : 1,
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

const modeSchema = z.object({
  accept: z.boolean(),
});

const useCurrentMode = () => {
  return useQuery(['mode'], () =>
    kyx
      .get('config')
      .then((res) => res.json())
      .then(modeSchema.parseAsync)
      .then(({ accept }) => accept)
  );
};

const useToggleMode = () => {
  const qc = useQueryClient();
  return useMutation(['toggle-mode'], () => kyx.post('config'), {
    onMutate: () => {
      qc.setQueryData<boolean>(['mode'], (mode) => !mode);
    },
    onSettled: () => {
      return qc.invalidateQueries(['mode']);
    },
  });
};

const Control = () => {
  const { data } = useCurrentMode();
  const { mutate } = useToggleMode();
  return (
    <Fab
      variant={'extended'}
      color={!data ? 'success' : 'error'}
      sx={{
        position: 'sticky',
        bottom: 15,
        zIndex: 100,
        float: 'right',
        mr: 1,
      }}
      onClick={() => mutate()}
    >
      {!data ? (
        <PlayCircle sx={{ mr: 1 }} />
      ) : (
        <StopCircleIcon sx={{ mr: 1 }} />
      )}
      {!data ? '開始點歌' : '停止點歌'}
    </Fab>
  );
};

const useInsertRequest = () => {
  const qc = useQueryClient();
  return useMutation(
    ['insert-request'],
    (title: string) =>
      kyx.post('requests', {
        json: {
          title,
        },
      }),
    {
      onMutate: (title) => {
        const now = new Date();
        const iso = now.toISOString();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        ).toISOString();
        const r: Request = {
          id: v4(),
          key: today,
          title,
          done: false,
          requester: '系統',
          createdAt: iso,
          updatedAt: iso,
        };
        qc.setQueryData<InfiniteData<RequestListing>>(
          ['requests'],
          (requests) => {
            if (!requests) return requests;
            const first = head(requests.pages);
            if (!first) return assoc('pages', [{ data: [r] }], requests);
            const { data } = first;
            const compareFn = (a: number, b: number) => {
              if (a < b) return -1;
              if (a > b) return 1;
              return 0;
            };
            const modified = sort(req.requestCompareFn, [r, ...data]);
            const modifiedPages = [
              assoc('data', modified, first),
              ...tail(requests.pages),
            ];
            return assoc('pages', modifiedPages, requests);
          }
        );
      },
      onSettled: () => {
        return qc.invalidateQueries(['requests']);
      },
    }
  );
};

const RequestInput = () => {
  const [title, setTitle] = useState('');
  const { mutate } = useInsertRequest();
  return (
    <TextField
      placeholder={'ENTER鍵加入歌單'}
      size={'small'}
      variant={'outlined'}
      sx={{ width: '100%' }}
      value={title}
      onKeyUp={(e) => {
        if (title.length === 0 || e.key !== 'Enter') return;
        setTitle('');
        mutate(title);
      }}
      onChange={(e) => setTitle(e.currentTarget.value)}
    />
  );
};

const ApiKeyModal = () => {
  const qc = useQueryClient();
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const k = localStorage.getItem('api-key');
    if (k) {
      setOpen(false);
    } else {
      setOpen(true);
    }
    return () => {
      setOpen(false);
    };
  }, [setOpen]);

  const setLocalKey = useCallback(() => {
    if (!input) return;
    localStorage.setItem('api-key', input);
    setInput('');
    setOpen(false);
    qc.resetQueries();
  }, [input, setInput, setOpen, qc]);

  return (
    <Dialog open={open}>
      <DialogTitle sx={{ px: 2 }}>{'請輸入密碼'}</DialogTitle>
      <DialogContent sx={{ minWidth: '400px', p: 0, px: 2 }}>
        <TextField
          fullWidth
          type={'password'}
          size={'small'}
          sx={{ mt: 0.5 }}
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button disabled={input.length === 0} onClick={setLocalKey}>
          使用密碼
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CopySnackbar = () => {
  const open = useAtomValue(snackbarAtom);
  return (
    <Snackbar
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: { xs: 90 } }}
      open={open}
      children={
        <Alert
          severity={'success'}
          sx={{ width: '420px' }}
          children={'複製成功!'}
        />
      }
    />
  );
};

// a no op function
const noop = () => {};

function App() {
  const {
    data: listing,
    isLoading,
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
    console.log('requests', requests);
  }, [requests]);

  return (
    <div
      className={
        'container mx-auto max-w-md min-h-screen border-x border-solid border-gray-200 relative'
      }
    >
      <section
        className={
          'border-b py-2 px-4 text-gray-700 flex justify-between items-center'
        }
      >
        <div>DD的點歌系統</div>
        <Button
          size={'medium'}
          onClick={() => {
            localStorage.removeItem('api-key');
            window.location.reload();
          }}
        >
          清除密碼
        </Button>
      </section>
      <section className={'pt-5 p-3'}>
        <RequestInput />
      </section>
      {length(requests) === 0 && (
        <section
          className={'flex flex-col items-center gap-3 text-gray-500 py-4'}
        >
          <InfoRoundedIcon fontSize={'large'} />
          <p>暫無歌曲</p>
        </section>
      )}
      <List>
        {map(
          ({ key, data }) => (
            <li key={key}>
              <ul>
                <ListSubheader>{key}</ListSubheader>
                {map(
                  (request) => (
                    <RequestItem key={request.id} {...omit(['key'], request)} />
                  ),
                  data
                )}
              </ul>
            </li>
          ),
          requests
        )}
      </List>
      <Control />
      <ApiKeyModal />
      <CopySnackbar />
    </div>
  );
}

export default App;
