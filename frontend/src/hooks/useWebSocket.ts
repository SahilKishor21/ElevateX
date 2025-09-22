import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { useElevatorStore } from "@/store/elevatorStore";
import { useMetricsStore } from "@/store/metricsStore";
import { WEBSOCKET_EVENTS } from "@/lib/constants";
import { debugMetrics } from "@/lib/utils";

interface UseWebSocketProps {
  url?: string;
  autoConnect?: boolean;
}

interface SocketError {
  message: string;
}

interface SimulationUpdateData {
  elevators: any[];
  floorRequests: any[];
  activeRequests: any[];
  isRunning: boolean;
  currentTime: number;
  config?: any;
  totalRequests?: number;
  assignmentMetrics?: any;
  assignmentCompliance?: any;
}

interface MetricsUpdateData {
  performance: any;
  realTime: any;
  historical?: any;
  alerts?: any[];
  timestamp: number;
  assignmentMetrics?: any;
  assignmentCompliance?: any;
}

interface ConfigUpdateResponse {
  success: boolean;
  config?: any;
  error?: string;
  message?: string;
}

interface RequestResponse {
  success: boolean;
  requestId?: string;
  error?: string;
}

export const useWebSocket = ({
  url = "https://elevatex-2ght.onrender.com",
  autoConnect = true,
}: UseWebSocketProps = {}) => {
  const socketRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);

  const {
    setElevators,
    setFloorRequests,
    setActiveRequests,
    setIsRunning,
    setCurrentTime,
    updateConfig: updateStoreConfig,
    activeRequests,
    floorRequests,
    setAssignmentMetrics,
  } = useElevatorStore();

  const {
    updatePerformanceMetrics,
    updateRealTimeMetrics,
    addHistoricalData,
    addAlert,
    updateAssignmentMetrics: updateMetricsAssignmentData,
    updateAssignmentCompliance,
  } = useMetricsStore();

  const connect = () => {
    if (socketRef.current?.connected) return;

    console.log("Connecting to WebSocket server...");
    socketRef.current = io(url, {
      transports: ["websocket"],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    if (typeof window !== "undefined") {
      (window as any).socket = socketRef.current;
    }

    socketRef.current.on("connect", () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setError(null);
    });

    socketRef.current.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    });

    socketRef.current.on("connect_error", (err: any) => {
      console.error("WebSocket connection error:", err);
      setError(err.message || "Connection failed");
      setIsConnected(false);
    });

    socketRef.current.on(
      WEBSOCKET_EVENTS.SIMULATION_UPDATE,
      (data: SimulationUpdateData) => {
        const currentActive = activeRequests.length;
        const currentFloor = floorRequests.length;
        const newActive = data.activeRequests?.length || 0;
        const newFloor = data.floorRequests?.length || 0;

        if (currentActive !== newActive || currentFloor !== newFloor) {
          debugMetrics("WebSocket - State Change", {
            active: `${currentActive} → ${newActive}`,
            floor: `${currentFloor} → ${newFloor}`,
            running: data.isRunning,
            lobbyTraffic: data.assignmentMetrics?.lobbyToUpperRequests || 0,
          });
        }

        try {
          if (data.elevators !== undefined) {
            const elevatorsArray = Array.isArray(data.elevators)
              ? data.elevators
              : [];
            setElevators(elevatorsArray);
          }

          if (data.floorRequests !== undefined) {
            const floorRequestsArray = Array.isArray(data.floorRequests)
              ? data.floorRequests
              : [];
            console.log(
              "WebSocket - Received floor requests:",
              floorRequestsArray
            );
            debugMetrics("WebSocket - Floor Requests Update", {
              received: floorRequestsArray.length,
              requests: floorRequestsArray,
            });
            setFloorRequests(floorRequestsArray);
          }

          if (data.activeRequests !== undefined) {
            const activeRequestsArray = Array.isArray(data.activeRequests)
              ? data.activeRequests
              : [];
            setActiveRequests(activeRequestsArray);
          }

          if (data.isRunning !== undefined) {
            setIsRunning(data.isRunning);
          }

          if (data.currentTime !== undefined) {
            setCurrentTime(data.currentTime);
          }

          if (data.config) {
            updateStoreConfig(data.config);
          }

          if (data.assignmentMetrics) {
            debugMetrics(
              "WebSocket - Assignment Metrics Received",
              data.assignmentMetrics
            );
            setAssignmentMetrics(data.assignmentMetrics);
            updateMetricsAssignmentData(data.assignmentMetrics);
          }

          if (data.assignmentCompliance) {
            debugMetrics(
              "WebSocket - Assignment Compliance Received",
              data.assignmentCompliance
            );
            updateAssignmentCompliance(data.assignmentCompliance);
          }

          setLastUpdateTime(Date.now());
        } catch (updateError) {
          console.error("State update error:", updateError);
          setError(`State update failed: ${updateError}`);
        }
      }
    );
    socketRef.current.on(
      WEBSOCKET_EVENTS.METRICS_UPDATE,
      (data: MetricsUpdateData) => {
        try {
          if (data.performance && typeof data.performance === "object") {
            debugMetrics("WebSocket - Performance Metrics", {
              averageWaitTime: data.performance.averageWaitTime,
              starvationCount: data.performance.starvationCount,
              assignmentCompliance: data.performance.assignmentCompliance,
            });

            const sanitizedPerformance = {
              averageWaitTime:
                typeof data.performance.averageWaitTime === "number"
                  ? data.performance.averageWaitTime
                  : 0,
              maxWaitTime:
                typeof data.performance.maxWaitTime === "number"
                  ? data.performance.maxWaitTime
                  : 0,
              starvationCount:
                typeof data.performance.starvationCount === "number"
                  ? data.performance.starvationCount
                  : 0,
              throughput:
                typeof data.performance.throughput === "number"
                  ? data.performance.throughput
                  : 0,
              ...data.performance,
            };

            updatePerformanceMetrics(sanitizedPerformance);
          }

          if (data.realTime && typeof data.realTime === "object") {
            debugMetrics("WebSocket - Real-time Metrics", {
              activeRequests: data.realTime.activeRequests,
              starvationAlerts: data.realTime.starvationAlerts,
              peakHourStatus: data.realTime.peakHourStatus,
            });
            updateRealTimeMetrics(data.realTime);
          }

          if (data.historical && typeof data.historical === "object") {
            addHistoricalData(data.historical);
          }

          if (data.alerts && Array.isArray(data.alerts)) {
            data.alerts.forEach((alert: any) => {
              if (alert && typeof alert === "object" && alert.id) {
                addAlert(alert);
              }
            });
          }

          if (
            data.assignmentMetrics &&
            typeof data.assignmentMetrics === "object"
          ) {
            debugMetrics(
              "WebSocket - Assignment Metrics in Metrics Update",
              data.assignmentMetrics
            );
            updateMetricsAssignmentData(data.assignmentMetrics);
          }

          if (
            data.assignmentCompliance &&
            typeof data.assignmentCompliance === "object"
          ) {
            debugMetrics(
              "WebSocket - Assignment Compliance in Metrics Update",
              data.assignmentCompliance
            );
            updateAssignmentCompliance(data.assignmentCompliance);
          }
        } catch (metricsError) {
          console.error("Metrics update error:", metricsError);
          setError(`Metrics update failed: ${metricsError}`);
        }
      }
    );

    // Algorithm update handling with debugging
    socketRef.current.on("algorithm_update", (data: any) => {
      if (data.error) {
        console.error("Algorithm update error:", data.error);
        setError(`Algorithm update failed: ${data.error}`);
      } else if (data.algorithm) {
        debugMetrics("WebSocket - Algorithm Update", {
          algorithm: data.algorithm,
        });
      }
    });

    socketRef.current.on(
      WEBSOCKET_EVENTS.CONFIG_UPDATED,
      (data: ConfigUpdateResponse) => {
        debugMetrics("WebSocket - Config Update Response", {
          success: data.success,
        });

        if (data.success && data.config) {
          updateStoreConfig(data.config);

          if (data.config.requestFrequency !== undefined) {
            debugMetrics("WebSocket - Request Frequency Updated", {
              frequency: data.config.requestFrequency,
            });
          }
        } else if (!data.success && data.error) {
          console.error("Config update failed:", data.error);
          setError(data.error);
        }
      }
    );

    socketRef.current.on("request_added", (data: RequestResponse) => {
      if (data.success) {
        debugMetrics("WebSocket - Request Added Successfully", {
          requestId: data.requestId,
        });
        setError(null);
      } else if (data.error) {
        console.error("Request add failed:", data.error);
        setError(data.error);
      }
    });

    socketRef.current.on("error", (err: any) => {
      console.error("Socket error:", err);
      setError(err.message || "Unknown socket error");
    });

    const connectionTimeout = setTimeout(() => {
      if (!socketRef.current?.connected) {
        console.warn("Connection timeout - server may be unavailable");
        setError("Connection timeout - server may be unavailable");
      }
    }, 10000);

    socketRef.current.on("connect", () => {
      clearTimeout(connectionTimeout);
    });
  };

  const disconnect = () => {
    if (socketRef.current) {
      console.log("Disconnecting WebSocket...");
      socketRef.current.disconnect();
      setIsConnected(false);
    }
  };

  const emit = (event: string, data?: any) => {
    if (!socketRef.current?.connected) {
      const errorMsg = `Not connected to server. Cannot emit ${event}`;
      console.error(errorMsg);
      setError(errorMsg);
      return false;
    }

    try {
      socketRef.current.emit(event, data);
      if (event === WEBSOCKET_EVENTS.ADD_REQUEST && data) {
        debugMetrics("WebSocket - Emitting Request", {
          route: `${data.originFloor}→${data.destinationFloor}`,
          direction: data.direction,
        });
      }
      if (error) {
        setError(null);
      }

      return true;
    } catch (emitError) {
      console.error(`Error emitting ${event}:`, emitError);
      setError(`Failed to emit ${event}: ${emitError}`);
      return false;
    }
  };

  const startSimulation = (config?: any) => {
    debugMetrics("WebSocket - Starting Simulation", {
      elevators: config?.numElevators || "default",
      floors: config?.numFloors || "default",
      frequency: config?.requestFrequency || "default",
    });

    return emit(WEBSOCKET_EVENTS.START_SIMULATION, config);
  };

  const stopSimulation = () => {
    debugMetrics("WebSocket - Stopping Simulation", {});
    return emit(WEBSOCKET_EVENTS.STOP_SIMULATION);
  };

  const resetSimulation = () => {
    debugMetrics("WebSocket - Resetting Simulation", {});
    return emit(WEBSOCKET_EVENTS.RESET_SIMULATION);
  };

  const addRequest = (request: any) => {
    // Enhanced request logging for debugging
    const requestType =
      request.originFloor === 1 && request.destinationFloor > 5
        ? "LOBBY_TO_UPPER"
        : request.originFloor > 5 && request.destinationFloor === 1
        ? "UPPER_TO_LOBBY"
        : "INTER_FLOOR";

    debugMetrics("WebSocket - Adding Request", {
      route: `${request.originFloor}→${
        request.destinationFloor || "Floor Call"
      }`,
      type: requestType,
      direction: request.direction,
    });

    const hour = new Date().getHours();
    const isPeakHour = [8, 9, 12, 13, 17, 18].includes(hour);

    if (isPeakHour) {
      debugMetrics("WebSocket - Peak Hour Request", {
        hour: `${hour}:00`,
        type: requestType,
      });
    }

    return emit(WEBSOCKET_EVENTS.ADD_REQUEST, request);
  };

  const updateConfig = (config: any) => {
    debugMetrics("WebSocket - Updating Config", config);

    if (config.requestFrequency !== undefined) {
      debugMetrics("WebSocket - Request Frequency Change", {
        frequency: `${config.requestFrequency}/min`,
      });
    }
    if (config.numElevators !== undefined) {
      debugMetrics("WebSocket - Elevator Count Change", {
        count: config.numElevators,
      });
    }

    return emit(WEBSOCKET_EVENTS.CONFIG_CHANGE, config);
  };

  const emergencyStop = () => {
    debugMetrics("WebSocket - Emergency Stop", {});
    return emit(WEBSOCKET_EVENTS.EMERGENCY_STOP);
  };

  const clearError = () => {
    setError(null);
  };

  const requestAssignmentReport = () => {
    debugMetrics("WebSocket - Requesting Assignment Report", {});
    return emit("get_assignment_compliance");
  };

  const triggerPeakTraffic = (
    type: "morning" | "evening" | "lunch" = "morning"
  ) => {
    debugMetrics("WebSocket - Triggering Peak Traffic", { type });
    return emit("trigger_peak_traffic", { type });
  };

  useEffect(() => {
    if (!isConnected) return;

    const healthCheck = setInterval(() => {
      if (socketRef.current?.connected) {
      } else {
        console.warn("Socket disconnected unexpectedly");
        setIsConnected(false);
      }
    }, 5000);

    return () => clearInterval(healthCheck);
  }, [isConnected]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, autoConnect]);

  useEffect(() => {
    const handleOnline = () => {
      if (!isConnected && autoConnect) {
        debugMetrics("WebSocket - Network Restored", {});
        setTimeout(() => {
          connect();
        }, 1000);
      }
    };

    const handleOffline = () => {
      debugMetrics("WebSocket - Network Lost", {});
      setError("Network connection lost");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isConnected, autoConnect]);

  return {
    isConnected,
    error,
    lastUpdateTime,
    connect,
    disconnect,
    emit,
    startSimulation,
    stopSimulation,
    resetSimulation,
    addRequest,
    updateConfig,
    emergencyStop,
    clearError,

    requestAssignmentReport,
    triggerPeakTraffic,

    getSocketInfo: () => ({
      connected: socketRef.current?.connected,
      id: socketRef.current?.id,
      transport: socketRef.current?.io?.engine?.transport?.name,
    }),

    getCurrentStoreState: () => ({
      activeRequests: activeRequests.length,
      floorRequests: floorRequests.length,
      lastUpdate: lastUpdateTime,
      assignmentMetrics: "available in store",
    }),

    getAssignmentStatus: () => {
      const hour = new Date().getHours();
      const isPeakHour = [8, 9, 12, 13, 17, 18].includes(hour);
      const peakType =
        hour >= 8 && hour <= 10
          ? "MORNING_RUSH"
          : hour >= 12 && hour <= 14
          ? "LUNCH_RUSH"
          : hour >= 17 && hour <= 19
          ? "EVENING_RUSH"
          : "NORMAL";

      return {
        currentHour: hour,
        isPeakHour,
        peakType,
        isAssignmentRelevantTime: hour === 9,
        expectedLobbyTraffic: hour === 9 ? "70%" : "varies",
      };
    },
  };
};
