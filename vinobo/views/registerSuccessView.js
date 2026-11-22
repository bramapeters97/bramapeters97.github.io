import Link from "next/link";

export default function RegisterSuccessView() {
  return (
    <div>
      <h3>You have successfully registered a Vinobo account.</h3>
      <Link href="/">
        <a className={"btn"} style={{ fontSize: "1.5em", backgroundColor: "#8af" }}>
          Start using Vinobo <i className={"fas fa-angle-double-right"} />
        </a>
      </Link>
    </div>
  );
}
