/**
 * Logger Utility
 * 
 * Centralized logging with levels and structured output
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'INFO'];

class Logger {
  /**
   * Format log message with timestamp and level
   */
  _format(level, message, meta = null) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level}] ${message}`;
    
    if (meta) {
      return `${formatted} ${JSON.stringify(meta, null, 2)}`;
    }
    
    return formatted;
  }
  
  /**
   * Log at DEBUG level
   */
  debug(message, meta = null) {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(this._format('DEBUG', message, meta));
    }
  }
  
  /**
   * Log at INFO level
   */
  info(message, meta = null) {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      console.log(this._format('INFO', message, meta));
    }
  }
  
  /**
   * Log at WARN level
   */
  warn(message, meta = null) {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(this._format('WARN', message, meta));
    }
  }
  
  /**
   * Log at ERROR level
   */
  error(message, error = null) {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(this._format('ERROR', message));
      
      if (error && error.stack) {
        console.error(error.stack);
      }
    }
  }
}

module.exports = new Logger();
