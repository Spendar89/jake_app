import handlers from './handlers';

export default function register (dispatch) {
    for (let key in handlers) {
      this.socket.on(key, payload => {
        dispatch({
          key,
          payload
        });
      });
    }
};
