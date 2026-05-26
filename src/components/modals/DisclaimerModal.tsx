interface Props {
  onAccept: () => void;
}

export default function DisclaimerModal({ onAccept }: Props) {
  return (
    <div className="modal-overlay open">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div className="modal-title">Before you continue</div>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="warning-box" style={{ marginTop: 0 }}>
            Slender is designed for adults aged 18 and over. The calorie and
            BMR calculations use the Mifflin–St Jeor formula, which is validated
            for adults only and may not be accurate for younger users.
          </div>

          <p style={{ fontSize: '.88rem', color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
            <strong>This app is not medical advice.</strong> The estimates
            provided (BMR, TDEE, calorie targets, body composition) are
            approximations for informational purposes only. They do not account
            for individual health conditions, medications, or clinical needs.
          </p>

          <p style={{ fontSize: '.88rem', color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
            Always consult a qualified healthcare professional before making
            significant changes to your diet or exercise routine, especially if
            you have an existing medical condition.
          </p>

          <p style={{ fontSize: '.80rem', color: 'var(--text3)', lineHeight: 1.5, margin: 0 }}>
            By tapping <em>I understand</em> you acknowledge that the developers
            of Slender accept no liability for decisions made based on the
            information displayed in this app.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary btn-full" onClick={onAccept}>
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}
