import { ADD_USER } from '../constants/ActionTypes';

const initialState = [{
  userName: 'Spendar89',
  email: 'jakesendar@gmail.com'
}];

export default function users(state = initialState, action) {
  switch (action.type) {
    case ADD_USER:
      const id = state.length + 1;
      const user = { id, ...action.user };
      return [ user, ...state ];

    default:
      return state;
  };
};
