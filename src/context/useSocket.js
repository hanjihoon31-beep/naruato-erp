import { useContext } from "react";
import { SocketContext } from "./SocketContext.js";

export const useSocket = () => useContext(SocketContext);
