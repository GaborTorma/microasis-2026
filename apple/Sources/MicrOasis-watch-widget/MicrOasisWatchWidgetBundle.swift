import WidgetKit
import SwiftUI

@main
struct MicrOasisWidgetBundle: WidgetBundle {
    var body: some Widget {
        MicrOasisNowWidget()
        MicrOasisLaunchWidget()
    }
}
