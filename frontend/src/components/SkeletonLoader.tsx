import React from 'react'
import './SkeletonLoader.css'

interface SkeletonLoaderProps {
  type?: 'table' | 'card' | 'text' | 'line'
  rows?: number
  columns?: number
  className?: string
}

const SkeletonLoader = ({ 
  type = 'card', 
  rows = 3, 
  columns = 4,
  className = '' 
}: SkeletonLoaderProps) => {
  if (type === 'table') {
    return (
      <div className={`skeleton-table ${className}`} style={{ '--columns': columns } as React.CSSProperties}>
        <div className="skeleton-table-header">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="skeleton-cell skeleton-header-cell"></div>
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="skeleton-table-row">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="skeleton-cell"></div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (type === 'card') {
    return (
      <div className={`skeleton-card ${className}`}>
        <div className="skeleton-line skeleton-title"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line skeleton-line-short"></div>
      </div>
    )
  }

  if (type === 'line') {
    return (
      <div className={`skeleton-line ${className}`}></div>
    )
  }

  return (
    <div className={`skeleton-text ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-line" style={{ width: i === rows - 1 ? '60%' : '100%' }}></div>
      ))}
    </div>
  )
}

export default SkeletonLoader

