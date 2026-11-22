import HeaderPresenter from "../presenters/headerPresenter";

export default function Home({ children, model, auth }) {
  return (
    <>
      <HeaderPresenter model={model} auth={auth} />
      {children}
    </>
  );
}
