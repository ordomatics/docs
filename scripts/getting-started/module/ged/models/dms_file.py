from odoo import fields, models


class DmsFile(models.Model):
    _inherit = 'dms.file'

    ged_reference = fields.Char(
        string='Reference', copy=False, index=True,
        help="The document's filing reference, as written on the paper original.")
