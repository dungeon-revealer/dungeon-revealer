type ISendRequestOptions = {
  url: string;
  headers: {
    [headerName: string]: string | null;
  };
  onProgress?: (content: string) => void;
} & (
  | {
      method: "POST";
      body: FormData | string;
    }
  | {
      method: "GET";
    }
  | {
      method: "DELETE";
    }
  | {
      method: "PATCH";
      body: FormData | string;
    }
);

type IResult =
  | {
      type: "error";
    }
  | {
      type: "abort";
    }
  | {
      type: "success";
      data: string;
    };

export type ISendRequestTask = {
  abort: () => void;
  done: Promise<IResult>;
};

/**
 * Utility for sending HTTP requests with XMLHttpRequest
 *
 * 1. Fetch + AbortController Cancelation has bad browser support
 * 2. try/catch and promises swallows type information
 *
 */
export const sendRequest = (options: ISendRequestOptions): ISendRequestTask => {
  const request = new XMLHttpRequest();

  let _resolve = (_value: IResult) => {};

  const done = new Promise<IResult>((resolve) => {
    _resolve = resolve;
  });

  request.addEventListener("abort", () => {
    _resolve({
      type: "abort",
    });
  });
  request.addEventListener("error", () => {
    _resolve({
      type: "error",
    });
  });
  request.addEventListener("load", () => {
    _resolve({
      type: "success",
      data: request.responseText,
    });
  });

  if (options.onProgress) {
    let seenBytes = 0;
    request.addEventListener("readystatechange", (ev) => {
      if (request.readyState === 3) {
        const data = request.response.substr(seenBytes);
        seenBytes = request.responseText.length;
        options.onProgress?.(data);
      }
    });
  }

  request.open(options.method, options.url, true);
  for (const [header, value] of Object.entries(options.headers)) {
    if (!value) continue;
    request.setRequestHeader(header, value);
  }

  request.send(
    options.method === "POST" || options.method === "PATCH"
      ? options.body
      : undefined
  );

  return {
    abort: () => request.abort(),
    done,
  };
};
