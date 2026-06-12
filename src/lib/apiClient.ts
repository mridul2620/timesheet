import axios from "axios";

let accessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

// Intercept window.fetch and axios (only run on client side)
if (typeof window !== "undefined") {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    let url = "";
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else if (input instanceof Request) {
      url = input.url;
    }

    const backendUrl = (process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001").replace(/\/+$/, "");
    // Check if it's a request to our Node backend
    const isBackendRequest = url.startsWith(backendUrl) || url.startsWith("/api");

    if (isBackendRequest) {
      init = init || {};
      init.headers = init.headers || {};
      init.credentials = "include"; // Send cookies across ports

      if (accessToken) {
        if (init.headers instanceof Headers) {
          init.headers.set("Authorization", `Bearer ${accessToken}`);
        } else if (Array.isArray(init.headers)) {
          const authIndex = init.headers.findIndex(([k]) => k.toLowerCase() === "authorization");
          if (authIndex !== -1) {
            init.headers[authIndex] = ["Authorization", `Bearer ${accessToken}`];
          } else {
            init.headers.push(["Authorization", `Bearer ${accessToken}`]);
          }
        } else {
          (init.headers as Record<string, string>)["Authorization"] = `Bearer ${accessToken}`;
        }
      }
    }

    try {
      const response = await originalFetch(input, init);

      // If the backend returns 401 and it's not a login/refresh attempt, try to refresh
      if (
        response.status === 401 &&
        isBackendRequest &&
        !url.includes("/api/refresh") &&
        !url.includes("/api/login")
      ) {
        const retryOriginalRequest = new Promise<string>((resolve) => {
          subscribeTokenRefresh((token) => {
            resolve(token);
          });
        });

        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshResponse = await originalFetch(`${backendUrl}/api/refresh`, {
              method: "POST",
              credentials: "include",
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              accessToken = refreshData.accessToken;
              isRefreshing = false;
              onRefreshed(accessToken!);
            } else {
              isRefreshing = false;
              // Clear local state and redirect to login if refresh token expired/invalid
              localStorage.removeItem("loginResponse");
              window.location.href = "/login";
              return response;
            }
          } catch (err) {
            isRefreshing = false;
            console.error("Token refresh failed:", err);
            return response;
          }
        }

        // Wait for refreshing to finish and get the new token
        const newAccessToken = await retryOriginalRequest;

        // Retry the original request with the new token
        if (init && init.headers) {
          if (init.headers instanceof Headers) {
            init.headers.set("Authorization", `Bearer ${newAccessToken}`);
          } else if (Array.isArray(init.headers)) {
            const authIndex = init.headers.findIndex(([k]) => k.toLowerCase() === "authorization");
            if (authIndex !== -1) {
              init.headers[authIndex] = ["Authorization", `Bearer ${newAccessToken}`];
            } else {
              init.headers.push(["Authorization", `Bearer ${newAccessToken}`]);
            }
          } else {
            (init.headers as Record<string, string>)["Authorization"] = `Bearer ${newAccessToken}`;
          }
        }
        return originalFetch(input, init);
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  // Axios interceptors
  axios.interceptors.request.use((config) => {
    const backendUrl = (process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001").replace(/\/+$/, "");
    const isBackendRequest = config.url?.startsWith(backendUrl) || config.url?.startsWith("/api");
    
    if (isBackendRequest) {
      config.withCredentials = true;
      if (accessToken) {
        if (config.headers && typeof config.headers.set === 'function') {
          config.headers.set("Authorization", `Bearer ${accessToken}`);
        } else {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      }
    }
    return config;
  }, (error) => Promise.reject(error));

  axios.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const backendUrl = (process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001").replace(/\/+$/, "");
    const isBackendRequest = originalRequest.url?.startsWith(backendUrl) || originalRequest.url?.startsWith("/api");

    if (
      error.response?.status === 401 && 
      isBackendRequest && 
      !originalRequest._retry &&
      !originalRequest.url?.includes("/api/refresh") &&
      !originalRequest.url?.includes("/api/login")
    ) {
      originalRequest._retry = true;
      console.log("[Axios Interceptor] Caught 401, attempting token refresh...");

      const retryOriginalRequest = new Promise<string>((resolve) => {
        subscribeTokenRefresh((token) => resolve(token));
      });

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshResponse = await originalFetch(`${backendUrl}/api/refresh`, {
            method: "POST",
            credentials: "include",
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            accessToken = refreshData.accessToken;
            isRefreshing = false;
            console.log("[Axios Interceptor] Refresh successful, retrying request.");
            onRefreshed(accessToken!);
          } else {
            console.warn("[Axios Interceptor] Refresh failed with status", refreshResponse.status);
            isRefreshing = false;
            localStorage.removeItem("loginResponse");
            window.location.href = "/login";
            return Promise.reject(error);
          }
        } catch (err) {
          console.error("[Axios Interceptor] Refresh threw an error:", err);
          isRefreshing = false;
          return Promise.reject(error);
        }
      }

      const newAccessToken = await retryOriginalRequest;

      if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
        originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
      } else {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }
      return axios(originalRequest);
    }
    return Promise.reject(error);
  });
}
