const fs = require('fs');

let c = fs.readFileSync('src/components/purchasing/RecentActivityFeed.tsx', 'utf8');

c = c.replace(/<\/button>\s*\}\)\s*<\/>\s*\)\s*:\s*\(/, `</button>
                      )}
                      {(activity.status === 'Approved' || activity.status === 'Sent_to_vendor') && (
                        <Link href={\`/inventory?poId=\${activity.realId}\`} style={{ padding: '0.3rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', backgroundColor: 'white', fontSize: '0.65rem', cursor: 'pointer', textDecoration: 'none', color: 'inherit', fontWeight: 'bold' }}>Receive</Link>
                      )}
                    </>
                  ) : (`);

// also just in case it didn't match the exact pattern:
c = c.replace(/<\/button>\s*<\/>\s*\)\s*:\s*\(/, `</button>
                      )}
                      {(activity.status === 'Approved' || activity.status === 'Sent_to_vendor') && (
                        <Link href={\`/inventory?poId=\${activity.realId}\`} style={{ padding: '0.3rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', backgroundColor: 'white', fontSize: '0.65rem', cursor: 'pointer', textDecoration: 'none', color: 'inherit', fontWeight: 'bold' }}>Receive</Link>
                      )}
                    </>
                  ) : (`);

fs.writeFileSync('src/components/purchasing/RecentActivityFeed.tsx', c);
