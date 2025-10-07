import { LoggerInterface, LoggerResolver } from '~/types/infrastructure/logging';

const DEFAULT_LOGGER_NAME = 'default';
const DEFAULT_LOGGER: LoggerInterface = console;

export const useLogger: LoggerResolver = (_name: string = DEFAULT_LOGGER_NAME) => DEFAULT_LOGGER;
