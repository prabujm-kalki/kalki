import React from "react";

export default function PurchasingDashboardLoading() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "1rem",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        color: "#0f172a",
        fontFamily: "inherit",
      }}
    >
      {/* 1. Header Skeleton */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div
            style={{
              height: "28px",
              width: "220px",
              backgroundColor: "#e2e8f0",
              borderRadius: "8px",
              animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              height: "14px",
              width: "160px",
              backgroundColor: "#f1f5f9",
              borderRadius: "6px",
              animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
            }}
          />
        </div>
        <div
          style={{
            height: "44px",
            width: "170px",
            backgroundColor: "#e2e8f0",
            borderRadius: "10px",
            animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
          }}
        />
      </div>

      {/* 2. KPI Cards 4-Column Grid Skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "1rem 1.125rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "0.75rem",
              minHeight: "105px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  height: "12px",
                  width: "70px",
                  backgroundColor: "#f1f5f9",
                  borderRadius: "4px",
                  animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  height: "32px",
                  width: "32px",
                  backgroundColor: "#f1f5f9",
                  borderRadius: "8px",
                  animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
                }}
              />
            </div>
            <div
              style={{
                height: "26px",
                width: "90px",
                backgroundColor: "#e2e8f0",
                borderRadius: "6px",
                animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
              }}
            />
            <div
              style={{
                height: "12px",
                width: "80px",
                backgroundColor: "#f8fafc",
                borderRadius: "4px",
                animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
        ))}
      </div>

      {/* 3. Purchase Feed Section Skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              height: "20px",
              width: "150px",
              backgroundColor: "#e2e8f0",
              borderRadius: "6px",
              animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              height: "20px",
              width: "65px",
              backgroundColor: "#f1f5f9",
              borderRadius: "9999px",
              animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
            }}
          />
        </div>

        {/* Vertical list of 5 Purchase Order Card Skeletons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "1rem 1.125rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    height: "16px",
                    width: "160px",
                    backgroundColor: "#e2e8f0",
                    borderRadius: "6px",
                    animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    height: "12px",
                    width: "70px",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "4px",
                    animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: "0.5rem",
                  borderBottom: "1px dashed #f1f5f9",
                }}
              >
                <div
                  style={{
                    height: "18px",
                    width: "110px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #edf2f7",
                    borderRadius: "6px",
                    animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    height: "18px",
                    width: "80px",
                    backgroundColor: "#e2e8f0",
                    borderRadius: "6px",
                    animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    height: "22px",
                    width: "80px",
                    backgroundColor: "#fef3c7",
                    borderRadius: "9999px",
                    animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    height: "24px",
                    width: "95px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                    animation: "kalkiSkeletonPulse 1.5s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes kalkiSkeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
