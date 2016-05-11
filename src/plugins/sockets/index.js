import { handlers } from './handlers';

export default function (dispatch, socket) {
    for (let key in handlers) {
      socket.on(key, payload => {
        dispatch({
          key,
          payload
        });
      });
    }
};
