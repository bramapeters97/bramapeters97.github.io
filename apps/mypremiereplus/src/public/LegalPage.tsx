import { appUrl } from "../paths";
import { useEffect, type ReactNode } from "react";
import { PRICING } from "../../shared/pricing";
import { PublicFooter, PublicHeader, euro } from "./PublicInfo";
import Icon from "../admin/Icon";
import "./public.css";

export const legalPolicies = [
  {
    slug: "privacy",
    title: "Privacy",
    description: "What the demo stores, who can access it and your choices.",
  },
  {
    slug: "terms",
    title: "Terms of use",
    description: "Accounts, the local demonstration and responsibilities.",
  },
  {
    slug: "cookies",
    title: "Cookies & browser storage",
    description: "Necessary sign-in storage and local preferences.",
  },
  {
    slug: "legal-notice",
    title: "Legal notice",
    description: "Operator information still required before a public service.",
  },
  {
    slug: "content",
    title: "Content & contributions",
    description: "Ownership, permissions, guest uploads and sensitive footage.",
  },
  {
    slug: "accessibility",
    title: "Accessibility",
    description: "Interface support, current limitations and feedback.",
  },
  {
    slug: "billing",
    title: "Example pricing & billing",
    description: "Footage blocks, demo invoices and future consumer terms.",
  },
] as const;

export function LegalLinks({ minimal = false }: { minimal?: boolean }) {
  return (
    <nav className="mpp-legal-links" aria-label="Legal information">
      {legalPolicies
        .filter(
          (p) =>
            !minimal ||
            ["privacy", "terms", "cookies", "legal-notice"].includes(p.slug),
        )
        .map((p) => (
          <a href={appUrl(`/legal/${p.slug}`)} key={p.slug}>
            {p.title}
          </a>
        ))}
    </nav>
  );
}

function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="pub-policy-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function OperatorNotice() {
  return (
    <aside className="pub-policy-alert" role="note">
      <Icon name="edit" size={22} />
      <div>
        <strong>Draft for a local demonstration</strong>
        <p>
          The legal operator and contact details have not been supplied. These
          pages describe the current build and identify information that must be
          completed before a commercial launch. They are not a declaration of
          legal compliance or a paid service agreement.
        </p>
      </div>
    </aside>
  );
}
const gdpr = "https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/";
const consumer =
  "https://europa.eu/youreurope/business/selling-in-eu/selling-goods-services/ecommerce-distance-selling/index_en.htm";
const rights =
  "https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en";
const cookies =
  "https://europa.eu/youreurope/business/growing/digitalising/online-privacy/index_en.htm";

function Privacy() {
  return (
    <>
      <Section title="Who is responsible?">
        <p>
          MyPremierePlus is the name of this software demonstration. The person
          or organisation operating a future hosted service must identify itself
          here:{" "}
          <strong>
            [Legal operator name, registered address, registration number where
            applicable, privacy email and country]
          </strong>
          . No monitored privacy contact has been configured in the demo.
        </p>
        <p>
          An archive owner decides which family footage to add, who may view it
          and which contributions to approve. The operator’s controller or
          processor role, and the archive owner’s own responsibilities, depend
          on the actual deployment and use. A purely personal household use and
          a commercial hosting service can have different legal positions. Those
          roles must be assessed before real personal media is hosted.
        </p>
      </Section>
      <Section title="Information used by the current build">
        <ul>
          <li>
            <strong>Account and access data:</strong> name, email, password
            hash, archive membership, roles, sign-in sessions, approved devices
            and invitation records.
          </li>
          <li>
            <strong>Family content:</strong> uploaded videos, images, audio,
            titles, dates, descriptions, locations, people labels, moments,
            manually added transcripts, written stories and contributor names.
            Footage can reveal personal and sensitive information about people
            who do not have an account.
          </li>
          <li>
            <strong>Viewing and preferences:</strong> selected profile,
            favourites, watch history and progress, Family TV sessions, archive
            appearance and access settings. Some preferences stay in the
            browser; some viewing records are stored by the server.
          </li>
          <li>
            <strong>Operational records:</strong> upload metadata, administrator
            activity, deleted records, metadata exports and access tokens. The
            local database and configured private asset directory hold this
            information.
          </li>
          <li>
            <strong>Demo billing:</strong> any example billing name, address,
            VAT identifier and plan choices you enter. The displayed card ending
            4242 is a fictional label. The software does not collect a real card
            number or process payments.
          </li>
        </ul>
        <p>
          Use fictional information when exploring this demonstration. Do not
          add irreplaceable originals or sensitive family footage to an
          unreviewed deployment.
        </p>
      </Section>
      <Section title="Why information is processed">
        <p>
          The build uses this data to authenticate members, deliver permitted
          media, organise the archive, remember viewing preferences, accept
          reviewed contributions, administer access and provide recovery and
          metadata export. It contains no advertising or analytics SDK and
          performs no automatic face recognition.
        </p>
        <p>
          A production operator must document a valid legal basis for each
          purpose. Depending on the situation this may involve performance of a
          service contract, a legal obligation, a properly assessed legitimate
          interest, or specific consent. Account registration alone does not
          establish consent from everyone shown in a film, and ordinary
          permission to upload does not automatically authorise processing of
          special category data. The lawful bases, sensitive data conditions and
          any required impact assessment remain deployment decisions. See the{" "}
          <a href={gdpr} target="_blank" rel="noreferrer">
            GDPR
          </a>
          .
        </p>
      </Section>
      <Section title="Who can see the archive">
        <p>
          The backend checks archive membership and account permissions. Owners
          and editors can administer archive content; viewers receive the
          content their account is allowed to access. Videos and collections can
          be limited to selected accounts. Viewing profiles are personalisation,
          not separate access boundaries. Shared credentials share the account’s
          permissions.
        </p>
        <p>
          Guest contribution links allow limited uploads, not browsing of the
          archive. Contributions wait for administrator review. Invitation and
          contribution links are bearer links: anyone who obtains a valid link
          may be able to use its permitted action until it expires or is
          disabled. Share them carefully.
        </p>
        <p>
          Private does not mean end-to-end encrypted. The local server operator
          and anyone with access to its database, asset files or backups may be
          able to access the stored material. A production service must specify
          staff access, hosting safeguards and incident procedures.
        </p>
      </Section>
      <Section title="Providers and international transfers">
        <p>
          The demo library uses licensed public stock videos from Pexels and
          Mixkit, with fictional archive titles and metadata. Video previews and
          playback connect to their external media hosts, including
          videos.pexels.com and assets.mixkit.co. These requests disclose your
          IP address and may disclose browser or device information, request
          headers and the requested media. A preview may load before you press
          Play. These requests do not upload your private archive files to a
          stock provider. The public introduction uses bundled artwork and local
          fonts; opening a provider link takes you to that provider's own site.
        </p>
        <p>
          Read the{" "}
          <a
            href="https://www.pexels.com/privacy-policy/"
            target="_blank"
            rel="noreferrer"
          >
            Pexels privacy policy
          </a>{" "}
          and the{" "}
          <a
            href="https://www.envato.com/privacy/"
            target="_blank"
            rel="noreferrer"
          >
            Envato privacy policy applying to Mixkit
          </a>
          . Public stock URLs can change or become unavailable. Their
          availability and licence terms are separate from your private archive.{" "}
          <a href={appUrl("/legal/legal-notice#stock-credits")}>
            Demo footage credits
          </a>{" "}
          identify the providers; administrators can open the per-clip source
          and licence list in Legal & policies.
        </p>
        <p>
          Cloudflare Stream may also deliver configured media or an additional
          sample stream. Cloudflare describes network and end user data in its{" "}
          <a
            href="https://www.cloudflare.com/privacypolicy/"
            target="_blank"
            rel="noreferrer"
          >
            privacy policy
          </a>
          , and its processing terms in its{" "}
          <a
            href="https://www.cloudflare.com/cloudflare-customer-dpa/"
            target="_blank"
            rel="noreferrer"
          >
            customer data processing addendum
          </a>
          . These documents do not establish which contract, region or transfer
          safeguards a particular operator has adopted.
        </p>
        <p>
          External AI generation, automatic transcription, email delivery and
          payment processing are not connected in this build. Demo AI cover
          previews use bundled artwork; private footage is not automatically
          sent to a generator. Before enabling a provider, the operator must
          name it, explain the purpose and data sent, assess its terms and
          retention, provide an appropriate choice where required, and document
          any international transfer safeguards. No EU only storage promise is
          made here.
        </p>
      </Section>
      <Section title="Retention, deletion and export">
        <ul>
          <li>
            Browser sign-in sessions expire after seven days. Signing out
            removes the current sign-in cookie; administrators can revoke
            relevant sessions or registered devices.
          </li>
          <li>
            Device sign-in challenges and temporary sign-in codes expire after
            five minutes. Archive invitations expire after seven days; ownership
            transfer links after one day. Contribution links use the
            administrator’s selected expiry and limits.
          </li>
          <li>
            Deleted archive records have a 30 day restoration window.{" "}
            <strong>
              The current build does not automatically erase all records, assets
              or backups when that window ends.
            </strong>{" "}
            Expiry removes the ability to restore through that workflow.
            Permanent record removal and a complete asset and backup purge
            policy need operator attention.
          </li>
          <li>
            Active archive content, activity history, generated export records
            and local preferences can remain until they are removed by the
            appropriate user or operator. There is no automatic account erasure
            workflow with a verified full purge in this demo.
          </li>
          <li>
            The administrator’s JSON export contains archive metadata. It does
            not include the original video, image or audio files and is not
            necessarily a complete response to a personal data access request.
          </li>
        </ul>
        <p>
          A production operator must publish a purpose based retention schedule,
          including provider copies, security logs and backups, and implement
          deletion and rights handling procedures.
        </p>
      </Section>
      <Section title="Children, family members and sensitive footage">
        <p>
          Family films may include children and people who have not joined the
          service. Ask permission where appropriate, explain the intended
          audience and use restricted account access. Avoid uploading identity
          documents, intimate footage, detailed health information or other
          highly sensitive material unless a reviewed deployment and valid
          permissions support that use.
        </p>
        <p>
          The demo has no automated age verification, parental consent
          verification, face identification or automatic sensitive content
          detection. The archive owner remains responsible for reviewing what is
          shared and responding to objections. A production operator must assess
          children’s data requirements and safeguards for its actual audience.
        </p>
      </Section>
      <Section title="Your data protection choices">
        <p>
          Where applicable, data protection law may provide rights to
          information, access, correction, deletion, restriction, portability
          and objection, and to withdraw consent where processing relies on it.
          Rights have conditions and must also respect other people’s rights.
          You may complain to the competent data protection supervisory
          authority. The{" "}
          <a href={rights} target="_blank" rel="noreferrer">
            European Commission explains these rights
          </a>
          .
        </p>
        <p>
          For this local build, contact the person running your instance or the
          archive owner through a channel you already know. A production
          operator must replace this sentence with a monitored contact, identity
          verification process, relevant supervisory authority and response
          procedure. Do not send identity documents to an unverified address.
        </p>
      </Section>
      <Section title="Changes to this notice">
        <p>
          This draft reflects the local build reviewed on 1 November 2026. A
          hosted operator must update the notice before adding purposes,
          providers or material changes, and provide any notice or choice
          required by applicable law.
        </p>
      </Section>
    </>
  );
}

function Terms() {
  return (
    <>
      <Section title="The service in this build">
        <p>
          MyPremierePlus is a local software demonstration for organising and
          watching authorised personal videos. Its demo library uses licensed
          public stock footage with fictional titles and metadata, alongside
          example account, pricing and billing screens. Stock films are
          placeholders, not customer family recordings or evidence of a depicted
          family's endorsement. Creating a demo archive does not create a paid
          subscription. No payment processor or production support commitment is
          connected.
        </p>
        <p>
          The future contracting operator must be identified in the{" "}
          <a href={appUrl("/legal/legal-notice")}>legal notice</a>. Commercial
          service terms, applicable jurisdiction and a monitored support contact
          remain to be completed before a real offer is made.
        </p>
      </Section>
      <Section title="Accounts and access">
        <p>
          Use accurate account information where required and keep sign-in
          credentials, temporary codes and invitation links secure. Only approve
          a device you recognise. Owners control archive membership and
          ownership transfer; editors administer content; viewers watch
          permitted material. A viewing profile is not an individual security
          account.
        </p>
        <p>
          Do not access another archive without permission, circumvent account
          restrictions, interfere with the service or upload malicious files. If
          an account or device is compromised, revoke its access and inform the
          person operating the instance.
        </p>
      </Section>
      <Section title="Your films remain yours">
        <p>
          You retain the rights you already hold in your uploads. Adding a film
          does not transfer its copyright to the software developer or operator.
          You must have the rights and permissions needed to store, process and
          share the content with your chosen audience.
        </p>
        <p>
          The operational permission needed is limited to storing, processing,
          displaying and delivering the material for the archive features you
          use, including authorised covers, previews and playback. This draft
          does not grant a licence to sell private footage, use it in
          advertising or train an external AI model. Any production provider
          terms and necessary processing permissions must be reviewed before
          enabling those services. See the{" "}
          <a href={appUrl("/legal/content")}>content policy</a>.
        </p>
      </Section>
      <Section title="Sharing and contributions">
        <p>
          Choose an appropriate audience, respect the privacy of people depicted
          and review guest contributions before publishing. A contributor should
          understand which archive receives the file and who may see it after
          approval. Upload links are not public viewing links. Links and
          selected account permissions should be reviewed when relationships or
          circumstances change.
        </p>
        <p>
          Personal premiere pages schedule and present a film. Playback is
          individual; this demonstration does not promise synchronised group
          playback. Family TV creates a viewing queue rather than a live
          broadcast service.
        </p>
      </Section>
      <Section title="Availability and keeping originals">
        <p>
          Public Pexels and Mixkit demo clips remain subject to their respective
          licences and provider availability. The demo does not transfer
          ownership of those clips or offer them as a stock download collection.
          See the{" "}
          <a href={appUrl("/legal/legal-notice#stock-credits")}>
            footage credits and licence links
          </a>
          .
        </p>
        <p>
          Browser compatibility, connection speed, file formats and external
          media availability can affect playback. Some placeholder streams can
          be unavailable or require a configured provider. The demo does not
          promise uninterrupted access, a particular picture quality or a
          professional preservation service.
        </p>
        <p>
          Keep your original files and independent backups. Metadata exports do
          not include your original media. Recently deleted records can be
          restored for 30 days where available; that mechanism is not a backup
          or a promise of full file recovery.
        </p>
      </Section>
      <Section title="Payments and consumer rights">
        <p>
          All prices, billing details and invoices currently shown are examples,
          with no actual charges. Future paid terms must clearly state the
          trader, total price, taxes, contract duration, renewal, cancellation,
          withdrawal rights and remedies before purchase. Mandatory consumer
          rights cannot be removed by this draft.
        </p>
        <p>
          EU distance service contracts generally involve a 14 day withdrawal
          period, subject to the applicable rules and exceptions. Digital
          content and services can have different requirements. Do not assume
          that registration or pressing Play waives a withdrawal right. A
          production checkout needs a correct assessment and any specific prior
          request, consent and acknowledgement required for its actual offer.
          See{" "}
          <a href={consumer} target="_blank" rel="noreferrer">
            official EU guidance on distance selling
          </a>{" "}
          and <a href={appUrl("/legal/billing")}>example billing</a>.
        </p>
      </Section>
      <Section title="Problems, removal and changes">
        <p>
          Ask the archive owner to correct access or remove inappropriate
          material. The local operator can restrict an account or content where
          necessary to address misuse, rights complaints or technical issues. A
          production service needs a clear notice, complaint and appeal
          procedure, applicable hosting obligations and an emergency contact;
          these have not been configured here.
        </p>
        <p>
          No broad liability exclusion, governing law or dispute forum is
          invented for an unknown operator. Those terms require review for the
          actual business and must preserve mandatory rights. These draft pages
          were reviewed on 1 November 2026.
        </p>
      </Section>
    </>
  );
}

function Cookies() {
  return (
    <>
      <Section title="A small amount of necessary storage">
        <p>
          This build uses first party storage for sign-in and features you
          request. It has no advertising or analytics SDK and no optional
          tracking consent banner. Fonts are bundled with the application, so
          selecting a typeface does not call Google Fonts at runtime.
        </p>
        <p>
          Necessary authentication storage can be treated differently from
          optional tracking under applicable rules. A production operator must
          verify the complete deployed site, including hosting and media
          providers, before relying on that position.{" "}
          <a href={cookies} target="_blank" rel="noreferrer">
            Official EU guidance explains the distinction
          </a>
          .
        </p>
      </Section>
      <Section title="Storage inventory">
        <div className="pub-policy-table">
          <table>
            <caption>Application storage used by the current build</caption>
            <thead>
              <tr>
                <th>Storage</th>
                <th>Purpose</th>
                <th>Lifetime</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>mpp_session</code>
                  <br />
                  First party cookie
                </td>
                <td>
                  Authenticates your account to the server. HttpOnly and
                  SameSite Strict; Secure in production mode.
                </td>
                <td>Seven days, or until sign-out, expiry or revocation.</td>
              </tr>
              <tr>
                <td>
                  <code>mypremiereplus:…</code>
                  <br />
                  Local storage
                </td>
                <td>
                  Archive and account scoped preferences such as selected
                  profile, viewing settings, favourites and progress.
                </td>
                <td>
                  Until changed or cleared from the browser; some records also
                  sync to the server.
                </td>
              </tr>
              <tr>
                <td>
                  Family TV queue reference
                  <br />
                  Local storage
                </td>
                <td>
                  Restores a viewing session for the signed-in archive and
                  account.
                </td>
                <td>
                  Until the session ends, is replaced, becomes invalid or
                  browser storage is cleared.
                </td>
              </tr>
              <tr>
                <td>
                  <code>mpp-watch-later:…</code>
                  <br />
                  Local storage
                </td>
                <td>Remembers a premiere saved for later in this browser.</td>
                <td>Until removed or browser storage is cleared.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Names containing an ellipsis include account, archive or content
          identifiers. These entries are not advertising identifiers.
          Development tooling may create its own technical state while running
          the development server.
        </p>
      </Section>
      <Section title="Media requests and external services">
        <p>
          Demo video previews and playback can connect to Pexels and Mixkit
          media hosts. Configured Cloudflare media may also connect to
          Cloudflare. These providers receive the IP address and technical
          request data needed to deliver the media. A preview may load before
          pressing Play. The application does not add a separate analytics
          cookie for these features, but that statement is not a guarantee about
          every provider or deployment.
        </p>
        <p>
          Do not assume that every future embedded media, payment or analytics
          service is cookie free. Before production, inspect the actual network
          and storage behaviour, name any extra storage here and obtain consent
          before nonessential storage where required. Read the{" "}
          <a
            href="https://www.pexels.com/privacy-policy/"
            target="_blank"
            rel="noreferrer"
          >
            Pexels privacy policy
          </a>
          ,{" "}
          <a
            href="https://www.envato.com/privacy/"
            target="_blank"
            rel="noreferrer"
          >
            Envato/Mixkit privacy policy
          </a>
          ,{" "}
          <a
            href="https://www.cloudflare.com/privacypolicy/"
            target="_blank"
            rel="noreferrer"
          >
            Cloudflare’s privacy information
          </a>{" "}
          and the <a href={appUrl("/legal/privacy")}>privacy notice</a>.
        </p>
      </Section>
      <Section title="Your controls">
        <p>
          Sign out to remove the current sign-in cookie. You can clear site data
          in your browser to remove local preferences and stored session
          references. Blocking the sign-in cookie prevents authenticated
          features from working; blocking local storage can prevent preferences
          and Family TV restoration from working.
        </p>
        <p>
          Clearing the browser does not delete the archive, server history,
          uploaded files or the account. Those require separate account or
          operator action. There is no “reject tracking” button because this
          build does not implement optional trackers. Adding them later requires
          a fresh assessment and appropriate controls.
        </p>
      </Section>
    </>
  );
}

function LegalNotice() {
  return (
    <>
      <Section title="Operator details to complete">
        <p>
          No legal entity, registration, tax status or business address has been
          provided for this demonstration. The product name is not a verified
          company name. A public service must replace the following placeholders
          with accurate information.
        </p>
        <p>
          The attribution “MyPremierePlus is part of Bram Peters Studio”
          identifies the public studio brand relationship. It does not establish
          a registered legal entity, contracting trader, tax status or monitored
          legal contact.
        </p>
        <dl className="pub-operator-fields">
          <div>
            <dt>Legal operator and trading name</dt>
            <dd>[To be supplied]</dd>
          </div>
          <div>
            <dt>Registered or service address</dt>
            <dd>[To be supplied]</dd>
          </div>
          <div>
            <dt>Company register and registration number</dt>
            <dd>[To be supplied, if applicable]</dd>
          </div>
          <div>
            <dt>VAT identification</dt>
            <dd>[To be supplied, if applicable]</dd>
          </div>
          <div>
            <dt>General and support contact</dt>
            <dd>[Monitored contact to be supplied]</dd>
          </div>
          <div>
            <dt>Privacy contact and representative / DPO</dt>
            <dd>[Contact and applicable role to be assessed]</dd>
          </div>
          <div>
            <dt>Rights complaints and safety contact</dt>
            <dd>[Monitored contact and process to be supplied]</dd>
          </div>
          <div>
            <dt>Governing consumer jurisdiction and dispute process</dt>
            <dd>[To be reviewed for the actual offer]</dd>
          </div>
        </dl>
      </Section>
      <Section title="What is currently available">
        <p>
          A local browser demonstration with licensed public stock videos,
          fictional archive records and generated generic artwork. It can store
          local test uploads and metadata. There is no connected payment
          service, production email delivery, real external AI generator or
          automatic transcription provider. Optional Cloudflare media delivery
          must be configured for real hosted footage.
        </p>
        <p>
          Do not interpret example invoices as tax invoices, sample pricing as a
          commercial offer, or these draft policies as a completed legal review.
          The software’s security controls do not by themselves establish legal
          compliance.
        </p>
      </Section>
      <Section title="Attribution and materials">
        <p>
          The interface uses bundled open licensed fonts, with their licences
          included in the project’s <code>public/fonts</code> directory. The
          marketing imagery is generic generated artwork, and illustrative names
          and stories are fictional. Third party media providers and software
          packages retain their own rights and terms.
        </p>
        <p>
          User uploaded content remains subject to its owner’s rights and the{" "}
          <a href={appUrl("/legal/content")}>
            content and contributions policy
          </a>
          . No public reuse permission is granted for private uploads.
        </p>
      </Section>
      <Section title="Demo footage credits" id="stock-credits">
        <p>
          The library's public sample videos are supplied by creators on{" "}
          <a href="https://www.pexels.com/" target="_blank" rel="noreferrer">
            Pexels
          </a>{" "}
          and{" "}
          <a href="https://mixkit.co/" target="_blank" rel="noreferrer">
            Mixkit
          </a>
          . Pexels clips use the{" "}
          <a
            href="https://www.pexels.com/license/"
            target="_blank"
            rel="noreferrer"
          >
            Pexels licence
          </a>
          ; selected Mixkit clips use the{" "}
          <a
            href="https://mixkit.co/license/#videoFree"
            target="_blank"
            rel="noreferrer"
          >
            Mixkit Stock Video Free License
          </a>
          , subject to{" "}
          <a href="https://mixkit.co/terms/" target="_blank" rel="noreferrer">
            Mixkit's terms
          </a>
          . Credits do not imply provider endorsement or ownership by
          MyPremierePlus.
        </p>
        <p>
          Archive titles, dates, collections, moments and premieres are
          fictional demonstrations and do not describe the actual stock
          subjects. Administrators can view each registered clip's author,
          original source page, licence, duration and verification information
          under Legal & policies. The repository's demo media record contains
          the full source list. The application does not offer a stock download
          library.
        </p>
        <p>
          Playing or previewing externally hosted footage sends a request to its
          media provider. URLs can change or become unavailable. Read{" "}
          <a href={appUrl("/legal/privacy")}>privacy</a> for provider
          information. Private user uploads remain separate from those public
          samples and their licences.
        </p>
      </Section>
      <Section title="Before a commercial launch">
        <p>
          The operator must complete these contact details, verify its legal
          roles and lawful processing, agree provider contracts, select
          supported regions, implement appropriate retention and rights
          procedures, complete consumer contracting information, assess
          accessibility obligations and arrange a legal review for the actual
          service.
        </p>
        <p>
          The repository includes a detailed production completion record in{" "}
          <code>docs/LEGAL.md</code>. This page is a visible statement of
          outstanding information, not a substitute for those operational steps.
          Draft reviewed 1 November 2026.
        </p>
      </Section>
    </>
  );
}

function Content() {
  return (
    <>
      <Section title="Only share what you are authorised to share">
        <p>
          Upload films, photographs, music, speech and other material only if
          you have the rights and permissions needed for the intended storage
          and audience. Buying a film or recording a television programme does
          not automatically give permission to share it through an archive.
          Other people can have copyright, privacy and personality rights in the
          same recording.
        </p>
        <p>
          Your uploads remain yours to the extent you own their rights. The
          archive needs permission to process and deliver them for the features
          you choose. This draft does not authorise public advertising, resale
          or external AI training with private family content.
        </p>
      </Section>
      <Section title="Respect the people in the picture">
        <p>
          Consider the context, the people depicted and their reasonable
          expectations before adding or widening access to a film. Ask
          permission where required and respect a request to restrict or remove
          personal material. Take extra care with children, intimate material,
          health information, private addresses, school details and identity
          documents.
        </p>
        <p>
          Use account based restrictions for sensitive material. Viewing
          profiles alone do not restrict access. Do not upload illegal,
          exploitative, threatening or privacy invasive content, material
          depicting child sexual abuse, or content that infringes another
          person’s rights. The demo has no automatic safety or age verification
          system; an administrator must review contributions.
        </p>
      </Section>
      <Section title="Guest uploads are reviewed">
        <p>
          An administrator creates a contribution link with an event name,
          expiry, allowed file types, file size limit and upload count. Anyone
          who obtains the valid link can use its upload permission until it
          expires or is disabled. It does not grant access to browse the
          archive.
        </p>
        <p>
          Contributions initially have a pending status. An administrator
          reviews them before they become published archive content. A
          contributor should understand who receives the file and the planned
          audience. Rejection or record deletion does not establish that every
          local asset or backup has been erased; the operator must handle a
          complete removal request.
        </p>
      </Section>
      <Section title="Covers, AI and voice stories">
        <p>
          You can choose an authorised frame, upload an authorised image or use
          the demo cover studio. The current studio uses generic bundled
          artwork, and local crops and title overlays are created in the
          browser. It does not automatically upload a family photograph to an
          external generator.
        </p>
        <p>
          A real AI or transcription provider must not be silently enabled for
          private media. Before sending content, identify the provider and
          purpose, check applicable rights and lawful grounds, explain retention
          and transfers and provide an appropriate explicit choice where
          required. A member cannot automatically grant every depicted person’s
          rights.
        </p>
        <p>
          Voice recording begins only after you choose the recording control and
          allow the browser’s microphone permission. You may upload an existing
          recording instead. Review the recording and the people it mentions
          before publishing.
        </p>
      </Section>
      <Section title="Corrections and rights complaints">
        <p>
          For a local instance, contact the archive owner or the person running
          the server through a known channel. Provide enough information to
          identify the film and concern without circulating the sensitive
          content further. The owner should promptly restrict access while
          reviewing a credible urgent concern.
        </p>
        <p>
          A production operator must supply a monitored reporting contact and a
          clear removal, response and appeal process, assess applicable hosting
          and illegal content obligations, and retain only the information
          needed to handle the matter. This demo does not provide an operational
          public abuse reporting desk.
        </p>
      </Section>
    </>
  );
}

function Accessibility() {
  return (
    <>
      <Section title="A considered interface, with work still to verify">
        <p>
          The build is designed to support keyboard operation, visible focus,
          responsive layouts, labelled form controls and reduced motion
          preferences. The public FAQ uses native disclosure controls, and key
          dialogs use the browser’s dialog element. These are implementation
          choices, not a formal accessibility certification.
        </p>
        <p>
          No independent conformance audit or comprehensive assistive technology
          assessment has been completed. We do not claim full WCAG 2.2 AA
          conformance.{" "}
          <a
            href="https://www.w3.org/TR/WCAG22/"
            target="_blank"
            rel="noreferrer"
          >
            W3C’s WCAG 2.2
          </a>{" "}
          provides a reference for continued evaluation.
        </p>
      </Section>
      <Section title="Using the interface">
        <ul>
          <li>
            Use Tab and Shift + Tab to move through links and controls. Use
            Enter or Space where appropriate to activate them.
          </li>
          <li>
            The public pages include a skip link to their main content. Section
            headings and form labels provide structure.
          </li>
          <li>
            Use your browser’s zoom and text settings. Narrow layouts reorganise
            content; some data tables scroll horizontally within their own
            region.
          </li>
          <li>
            Reduced motion preferences limit interface animation. A user can
            pause or stop video through the playback controls.
          </li>
          <li>
            Turn the TV interface off or return to the guide when you want to
            stop its viewing queue.
          </li>
        </ul>
      </Section>
      <Section title="Media accessibility depends on the archive">
        <p>
          Captions and transcripts depend on what the archive administrator
          supplies. The demo supports manually entered transcript segments and
          VTT files where configured, but does not automatically caption every
          upload or create audio description. Generic sample content may not
          have a complete accessible alternative.
        </p>
        <p>
          The visual meaning of a family film, music or speech may need a
          description or transcript added by its owner. A production archive
          should check those alternatives, keyboard playback controls, remote
          controls, contrast for every custom palette and font, screen reader
          announcements and device/browser compatibility.
        </p>
      </Section>
      <Section title="Known limitations and feedback">
        <p>
          There is no verified native TV or mobile app. Browser and assistive
          technology behaviour varies, particularly for custom playback,
          fullscreen mode and TV style navigation. User supplied cover text,
          colour choices and uploaded media can introduce accessibility
          barriers.
        </p>
        <p>
          The public service operator and accessibility contact have not been
          provided. For this local demo, report a barrier to the person running
          your instance through a known channel, including the page, device,
          browser, assistive technology and task you could not complete. Before
          launch, add a monitored contact, response process, applicable legal
          statement and documented assessment results.
        </p>
      </Section>
    </>
  );
}

function Billing() {
  return (
    <>
      <Section title="Examples, without a purchase">
        <p>
          No real subscription, card charge or payment processor is connected.
          The plan, address fields, card label and downloadable JSON invoices
          are demonstrations. They are not actual orders, receipts or tax
          invoices. The create account button creates a local demo archive, not
          a paid contract.
        </p>
      </Section>
      <Section title="How the example price is calculated">
        <p>
          The base example includes {PRICING.includedHours} hours of video
          footage at <strong>{euro(PRICING.monthly)} per month</strong> or{" "}
          <strong>{euro(PRICING.annual)} per year</strong>. Additional footage
          above {PRICING.includedHours} hours is rounded up to complete{" "}
          {PRICING.blockHours} hour blocks. Each extra block adds{" "}
          {euro(PRICING.extraBlockMonthly)} per month or{" "}
          {euro(PRICING.extraBlockAnnual)} per year.
        </p>
        <div className="pub-policy-table">
          <table>
            <caption>Illustrative footage prices</caption>
            <thead>
              <tr>
                <th>Footage</th>
                <th>Additional blocks</th>
                <th>Monthly total</th>
                <th>Yearly total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Up to 10 hours</td>
                <td>0</td>
                <td>€14.99</td>
                <td>€179.88</td>
              </tr>
              <tr>
                <td>More than 10, up to 15 hours</td>
                <td>1</td>
                <td>€17.49</td>
                <td>€209.88</td>
              </tr>
              <tr>
                <td>More than 15, up to 20 hours</td>
                <td>2</td>
                <td>€19.99</td>
                <td>€239.88</td>
              </tr>
              <tr>
                <td>25 hours</td>
                <td>3</td>
                <td>€22.49</td>
                <td>€269.88</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Yearly equals 12 times the monthly example; no annual discount is
          implied. Values are consumer price illustrations in EUR, shown as VAT
          inclusive for the example. The operator’s actual tax treatment, place
          of supply, VAT rate and invoicing obligations have not been
          determined. No amount is due.
        </p>
        <p>
          The calculator measures footage duration, not file size. It does not
          promise unlimited storage for images, audio or original files. A
          commercial plan must separately define its storage, upload, encoding,
          delivery and fair use limits before sale.
        </p>
      </Section>
      <Section title="Plan controls in the local demo">
        <p>
          An owner can choose monthly or yearly cadence and edit example billing
          details. Editors and viewers cannot manage the owner’s billing
          information. Saving those fields does not set up recurring payments,
          make a charge, cancel a real service or notify a payment provider.
        </p>
        <p>
          Do not enter real payment card details. The card ending 4242 is fixed
          fictional display information. Use fictional billing details while
          testing.
        </p>
      </Section>
      <Section title="What a paid service must explain first">
        <p>
          A production offer must clearly identify the trader and explain the
          complete consumer price, applicable taxes, what is included, contract
          duration, renewal and cancellation, payment timing, price changes,
          refunds, complaints and statutory remedies before a customer commits.
        </p>
        <p>
          Applicable distance selling and withdrawal requirements need a service
          specific assessment. EU guidance describes a general 14 day withdrawal
          period and conditional exceptions. Registration, uploading footage or
          playing a film must not be treated as a blanket waiver. Any early
          service request or digital content acknowledgement must be correctly
          designed for the actual offer. See{" "}
          <a href={consumer} target="_blank" rel="noreferrer">
            official EU consumer guidance
          </a>
          .
        </p>
        <p>
          These commercial terms and mechanisms are not implemented by the demo.{" "}
          <a href={appUrl("/about#pricing")}>
            Return to the example calculator
          </a>
          .
        </p>
      </Section>
    </>
  );
}

const pages: Record<string, () => ReactNode> = {
  privacy: Privacy,
  terms: Terms,
  cookies: Cookies,
  "legal-notice": LegalNotice,
  content: Content,
  accessibility: Accessibility,
  billing: Billing,
};

export default function LegalPage({ slug }: { slug: string }) {
  const policy = legalPolicies.find((p) => p.slug === slug);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${policy?.title || "Page not found"} · MyPremierePlus`;
    if (location.hash === "#stock-credits")
      document.getElementById("stock-credits")?.scrollIntoView();
    return () => {
      document.title = previousTitle;
    };
  }, [policy?.title]);
  const Content = pages[slug];
  return (
    <div className="mpp-public pub-legal-page">
      <a className="pub-skip" href="#legal-main">
        Skip to content
      </a>
      <PublicHeader compact />
      <main id="legal-main" className="pub-wrap">
        <div className="pub-policy-heading">
          <span className="pub-eyebrow">
            MYPREMIEREPLUS · INFORMATION & POLICIES
          </span>
          <h1>{policy?.title || "Page not found"}</h1>
          <p>
            {policy?.description ||
              "Choose a policy below, or return to the introduction."}
          </p>
          <span className="pub-policy-date">
            LOCAL DEMO DRAFT · REVIEWED 1 NOVEMBER 2026
          </span>
        </div>
        <div className="pub-policy-layout">
          <aside className="pub-policy-nav">
            <nav aria-label="Policy pages">
              {legalPolicies.map((p) => (
                <a
                  key={p.slug}
                  href={appUrl(`/legal/${p.slug}`)}
                  aria-current={slug === p.slug ? "page" : undefined}
                >
                  {p.title}
                  <Icon name="arrow" size={15} />
                </a>
              ))}
            </nav>
            <a className="pub-back-about" href={appUrl("/about")}>
              <Icon name="cinema" size={19} /> Back to the experience
            </a>
          </aside>
          <article className="pub-policy-content">
            <OperatorNotice />
            {Content ? (
              <Content />
            ) : (
              <Section title="Explore the policies">
                <p>
                  This policy address does not exist. Use the policy navigation
                  to find the information you need.
                </p>
                <a href={appUrl("/about")}>Return to MyPremierePlus</a>
              </Section>
            )}
            <div className="pub-policy-end">
              <Icon name="cinema" size={25} />
              <p>
                Your stories deserve care.
                <br />
                <span>Clear information is part of that.</span>
              </p>
              <a href="#legal-main">Back to top ↑</a>
            </div>
          </article>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
