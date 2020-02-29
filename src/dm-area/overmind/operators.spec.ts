import { switchMap } from "./operators";
import {
  Operator,
  pipe,
  map,
  Overmind,
  IConfig,
  IOperator,
  mutate
} from "overmind";

type TestType = {
  id: number;
};

it("can use switchMap", () => {
  expect.assertions(2);

  const getUser = (id: number): Promise<TestType> => {
    return new Promise(resolve => setTimeout(() => resolve({ id }), id));
  };

  const loadUser: Operator<number> = pipe(
    switchMap((_, id) => getUser(id)),
    mutate(({ state }, val) => {
      state.user = val;
    })
  );

  const state = {
    user: null as TestType | null
  };

  const config = {
    state,
    actions: {
      loadUser
    }
  };
  const overmind = new Overmind(config);

  type Config = IConfig<typeof config>;

  interface Operator<Input = void, Output = Input>
    extends IOperator<Config, Input, Output> {}

  const p1 = overmind.actions.loadUser(1);
  const p2 = overmind.actions.loadUser(200);

  return p1
    .then(() => {
      expect(overmind.state.user).toEqual(null);
      return p2;
    })
    .then(() => {
      expect(overmind.state.user).toEqual({ id: 200 });
    });
});
